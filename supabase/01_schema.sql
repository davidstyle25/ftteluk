-- ============================================================================
-- 01_schema.sql  —  Skema aplikasi BO Teluk Betung untuk Supabase self-hosted (Coolify)
--
-- Jalankan SEKALI sebagai role "postgres" di database Supabase:
--   * Supabase Studio  -> SQL Editor -> tempel seluruh isi file -> Run, ATAU
--   * docker exec -i <container supabase-db> psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/01_schema.sql
--
-- Aman dijalankan ulang (idempotent): CREATE ... IF NOT EXISTS dan ADD COLUMN IF NOT EXISTS,
-- sehingga juga melengkapi kolom yang kurang bila skema lama sempat berbeda.
--
-- Pengguna & password TIDAK dibuat di sini: login memakai Supabase Auth (auth.users).
-- Pindahkan user lama dengan scripts/migrate-users.mjs.
-- ============================================================================

set client_min_messages = warning;

-- ------------------------------------------------------------------ peran ----
do $$ begin
  create type public.app_role as enum ('admin', 'viewer');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ----------------------------------------------- tabel data (semua kolom text) --
-- Tiap tabel: id identity + kolom text. Daftar kolom mengikuti src/lib/table-columns.ts
-- dan kode aplikasi (produktivitas RMFT memakai tgl4, rka, rka_bulan; time series memakai
-- periode/keterangan/nilai).
do $$
declare
  spec jsonb := '{
    "data_depo": ["periode","kode_uker","cur_code","cur_desc","type","acctno","fdr_srl_no","principal_amount","short_name","withdrawable_int","issue_dt","mat_dt","int_rate","int_tenor_disp","renew","remark","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn","cbal_base"],
    "data_depo_data1": ["periode","kode_uker","cur_code","cur_desc","type","acctno","fdr_srl_no","principal_amount","short_name","withdrawable_int","issue_dt","mat_dt","int_rate","int_tenor_disp","renew","remark","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn","cbal_base"],
    "data_depo_data2": ["periode","kode_uker","cur_code","cur_desc","type","acctno","fdr_srl_no","principal_amount","short_name","withdrawable_int","issue_dt","mat_dt","int_rate","int_tenor_disp","renew","remark","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn","cbal_base"],
    "data_depo_data3": ["periode","kode_uker","cur_code","cur_desc","type","acctno","fdr_srl_no","principal_amount","short_name","withdrawable_int","issue_dt","mat_dt","int_rate","int_tenor_disp","renew","remark","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn","cbal_base"],
    "data_depo_data4": ["periode","kode_uker","cur_code","cur_desc","type","acctno","fdr_srl_no","principal_amount","short_name","withdrawable_int","issue_dt","mat_dt","int_rate","int_tenor_disp","renew","remark","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn","cbal_base"],
    "data_di319_data1": ["periode","uker_code","curr_code","curr_desc","account_number","ciff_no","short_name","open_dt","balance","in_balance","accrued_int","average_balance","prod_code","pn_pengelola_singlepn","pn_customer_service","pn_rm_dana_mantri","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer_rm_kredit_menengah","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn_pemasar","balance_dalam_idr"],
    "data_di319_data2": ["periode","uker_code","curr_code","curr_desc","account_number","ciff_no","short_name","open_dt","balance","in_balance","accrued_int","average_balance","prod_code","pn_pengelola_singlepn","pn_customer_service","pn_rm_dana_mantri","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer_rm_kredit_menengah","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn_pemasar","balance_dalam_idr"],
    "data_di319_data3": ["periode","uker_code","curr_code","curr_desc","account_number","ciff_no","short_name","open_dt","balance","in_balance","accrued_int","average_balance","prod_code","pn_pengelola_singlepn","pn_customer_service","pn_rm_dana_mantri","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer_rm_kredit_menengah","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn_pemasar","balance_dalam_idr"],
    "data_di319_data4": ["periode","uker_code","curr_code","curr_desc","account_number","ciff_no","short_name","open_dt","balance","in_balance","accrued_int","average_balance","prod_code","pn_pengelola_singlepn","pn_customer_service","pn_rm_dana_mantri","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer_rm_kredit_menengah","pn_sales_person","pn_pab","pn_rm_referral","jumlah_pn_pemasar","balance_dalam_idr"],
    "data_di321_data1": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_di321_data2": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_di321_data3": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_di321_data4": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_edc": ["tahun","periode","posisi","kode_kanwil","nama_kanwil","kode_kanca","nama_kanca","kode_uker","nama_uker","tid","mid","nama_merchant","jenis","kanwil_pemrakarsa","kanwil_nama_pemrakarsa","uker_pemrakarsa","uker_nama_pemrakarsa","kanwil_implementor","kanwil_nama_implementor","uker_implementor","uker_nama_implementor","pn_user_pemrakarsa","nama_user_pemrakarsa","last_available","status_available","last_utility","status_utility","last_transactional","status_transactional","alamat_merchant","kelurahan","kecamatan","kabupaten","provinsi","aktif_or_staging","jml_transaksi","sales_volume","akumulasi_transaksi","akumulasi_sales_volume","kartu_jml_transaksi_on_us","kartu_jml_transaksi_off_us","jml_transaksi_qris","kartu_sales_volume_on_us","kartu_sales_volume_off_us","sales_volume_qris","ket_mcc","kode_mcc","norek","cifno","saldo_posisi","ratas_saldo","saldo_posisi_by_cif","ratas_saldo_by_cif","tgl_approval","nilai","source","sales_volume_mid","flagging","flagging_bri_merchant","tiering_sales_volume","status_edc"],
    "data_edc_data1": ["tahun","periode","posisi","kode_kanwil","nama_kanwil","kode_kanca","nama_kanca","kode_uker","nama_uker","tid","mid","nama_merchant","jenis","kanwil_pemrakarsa","kanwil_nama_pemrakarsa","uker_pemrakarsa","uker_nama_pemrakarsa","kanwil_implementor","kanwil_nama_implementor","uker_implementor","uker_nama_implementor","pn_user_pemrakarsa","nama_user_pemrakarsa","last_available","status_available","last_utility","status_utility","last_transactional","status_transactional","alamat_merchant","kelurahan","kecamatan","kabupaten","provinsi","aktif_or_staging","jml_transaksi","sales_volume","akumulasi_transaksi","akumulasi_sales_volume","kartu_jml_transaksi_on_us","kartu_jml_transaksi_off_us","jml_transaksi_qris","kartu_sales_volume_on_us","kartu_sales_volume_off_us","sales_volume_qris","ket_mcc","kode_mcc","norek","cifno","saldo_posisi","ratas_saldo","saldo_posisi_by_cif","ratas_saldo_by_cif","tgl_approval","nilai","source","sales_volume_mid","flagging","flagging_bri_merchant","tiering_sales_volume","status_edc"],
    "data_edc_data2": ["tahun","periode","posisi","kode_kanwil","nama_kanwil","kode_kanca","nama_kanca","kode_uker","nama_uker","tid","mid","nama_merchant","jenis","kanwil_pemrakarsa","kanwil_nama_pemrakarsa","uker_pemrakarsa","uker_nama_pemrakarsa","kanwil_implementor","kanwil_nama_implementor","uker_implementor","uker_nama_implementor","pn_user_pemrakarsa","nama_user_pemrakarsa","last_available","status_available","last_utility","status_utility","last_transactional","status_transactional","alamat_merchant","kelurahan","kecamatan","kabupaten","provinsi","aktif_or_staging","jml_transaksi","sales_volume","akumulasi_transaksi","akumulasi_sales_volume","kartu_jml_transaksi_on_us","kartu_jml_transaksi_off_us","jml_transaksi_qris","kartu_sales_volume_on_us","kartu_sales_volume_off_us","sales_volume_qris","ket_mcc","kode_mcc","norek","cifno","saldo_posisi","ratas_saldo","saldo_posisi_by_cif","ratas_saldo_by_cif","tgl_approval","nilai","source","sales_volume_mid","flagging","flagging_bri_merchant","tiering_sales_volume","status_edc"],
    "data_edc_data3": ["tahun","periode","posisi","kode_kanwil","nama_kanwil","kode_kanca","nama_kanca","kode_uker","nama_uker","tid","mid","nama_merchant","jenis","kanwil_pemrakarsa","kanwil_nama_pemrakarsa","uker_pemrakarsa","uker_nama_pemrakarsa","kanwil_implementor","kanwil_nama_implementor","uker_implementor","uker_nama_implementor","pn_user_pemrakarsa","nama_user_pemrakarsa","last_available","status_available","last_utility","status_utility","last_transactional","status_transactional","alamat_merchant","kelurahan","kecamatan","kabupaten","provinsi","aktif_or_staging","jml_transaksi","sales_volume","akumulasi_transaksi","akumulasi_sales_volume","kartu_jml_transaksi_on_us","kartu_jml_transaksi_off_us","jml_transaksi_qris","kartu_sales_volume_on_us","kartu_sales_volume_off_us","sales_volume_qris","ket_mcc","kode_mcc","norek","cifno","saldo_posisi","ratas_saldo","saldo_posisi_by_cif","ratas_saldo_by_cif","tgl_approval","nilai","source","sales_volume_mid","flagging","flagging_bri_merchant","tiering_sales_volume","status_edc"],
    "data_edc_data4": ["tahun","periode","posisi","kode_kanwil","nama_kanwil","kode_kanca","nama_kanca","kode_uker","nama_uker","tid","mid","nama_merchant","jenis","kanwil_pemrakarsa","kanwil_nama_pemrakarsa","uker_pemrakarsa","uker_nama_pemrakarsa","kanwil_implementor","kanwil_nama_implementor","uker_implementor","uker_nama_implementor","pn_user_pemrakarsa","nama_user_pemrakarsa","last_available","status_available","last_utility","status_utility","last_transactional","status_transactional","alamat_merchant","kelurahan","kecamatan","kabupaten","provinsi","aktif_or_staging","jml_transaksi","sales_volume","akumulasi_transaksi","akumulasi_sales_volume","kartu_jml_transaksi_on_us","kartu_jml_transaksi_off_us","jml_transaksi_qris","kartu_sales_volume_on_us","kartu_sales_volume_off_us","sales_volume_qris","ket_mcc","kode_mcc","norek","cifno","saldo_posisi","ratas_saldo","saldo_posisi_by_cif","ratas_saldo_by_cif","tgl_approval","nilai","source","sales_volume_mid","flagging","flagging_bri_merchant","tiering_sales_volume","status_edc"],
    "data_mtd_giro": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_mtd_giro_kenaikan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "data_mtd_giro_penurunan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "data_mtd_tab": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_mtd_tab_kenaikan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "data_mtd_tab_penurunan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "data_pic_jalan": ["no_urut","unit_kerja","nama_rmft","nama_jalan","nama_toko","usaha","rek_bri","edc_bri","qris_bri","rek_lain","edc_lain","qris_lain","telpon","owner","keterangan","follow_up_terakhir"],
    "data_pivot_multi": ["seq","no_rek","nama","valuta","jenis_rekening","tanggal_transaksi","jam_transaksi","kode_transaksi","desk_transaksi","saldo_awal_mutasi","mutasi_debet","mutasi_kredit","saldo_akhir_mutasi","truser","glsign","auxtrc","uker_tran","uker_desc_tran"],
    "data_produktivitas_rmft": ["rm","dpk","tgl1","tgl2","tgl3","tgl4","rka","rka_bulan"],
    "data_qris": ["periode","posisi","region","rgdesc","mainbr","mbdesc","branch","x","brdesc","merchant_pan","storeid","nama_merchant","kriteria","jenis_usaha","kode_mcc","mcc","alamat","kode_pos","kota","provinsi","no_rek","cif","pn","pn_pemrakasa","jabatan","tgl_balikan_pten","status","merchant_type","akumulasi_sv_onus","akumulasi_sv_offus","akumulasi_sv_linkaja","akumulasi_sv_total","posisi_sv_total","akumulasi_trx_onus","akumulasi_trx_offus","akumulasi_trx_linkaja","akumulasi_trx_total","posisi_trx_total","saldo_posisi","ratas_saldo","flagging_bri_merchant","status_qris"],
    "data_qris_data1": ["periode","posisi","region","rgdesc","mainbr","mbdesc","branch","x","brdesc","merchant_pan","storeid","nama_merchant","kriteria","jenis_usaha","kode_mcc","mcc","alamat","kode_pos","kota","provinsi","no_rek","cif","pn","pn_pemrakasa","jabatan","tgl_balikan_pten","status","merchant_type","akumulasi_sv_onus","akumulasi_sv_offus","akumulasi_sv_linkaja","akumulasi_sv_total","posisi_sv_total","akumulasi_trx_onus","akumulasi_trx_offus","akumulasi_trx_linkaja","akumulasi_trx_total","posisi_trx_total","saldo_posisi","ratas_saldo","flagging_bri_merchant","status_qris"],
    "data_qris_data2": ["periode","posisi","region","rgdesc","mainbr","mbdesc","branch","x","brdesc","merchant_pan","storeid","nama_merchant","kriteria","jenis_usaha","kode_mcc","mcc","alamat","kode_pos","kota","provinsi","no_rek","cif","pn","pn_pemrakasa","jabatan","tgl_balikan_pten","status","merchant_type","akumulasi_sv_onus","akumulasi_sv_offus","akumulasi_sv_linkaja","akumulasi_sv_total","posisi_sv_total","akumulasi_trx_onus","akumulasi_trx_offus","akumulasi_trx_linkaja","akumulasi_trx_total","posisi_trx_total","saldo_posisi","ratas_saldo","flagging_bri_merchant","status_qris"],
    "data_qris_data3": ["periode","posisi","region","rgdesc","mainbr","mbdesc","branch","x","brdesc","merchant_pan","storeid","nama_merchant","kriteria","jenis_usaha","kode_mcc","mcc","alamat","kode_pos","kota","provinsi","no_rek","cif","pn","pn_pemrakasa","jabatan","tgl_balikan_pten","status","merchant_type","akumulasi_sv_onus","akumulasi_sv_offus","akumulasi_sv_linkaja","akumulasi_sv_total","posisi_sv_total","akumulasi_trx_onus","akumulasi_trx_offus","akumulasi_trx_linkaja","akumulasi_trx_total","posisi_trx_total","saldo_posisi","ratas_saldo","flagging_bri_merchant","status_qris"],
    "data_qris_data4": ["periode","posisi","region","rgdesc","mainbr","mbdesc","branch","x","brdesc","merchant_pan","storeid","nama_merchant","kriteria","jenis_usaha","kode_mcc","mcc","alamat","kode_pos","kota","provinsi","no_rek","cif","pn","pn_pemrakasa","jabatan","tgl_balikan_pten","status","merchant_type","akumulasi_sv_onus","akumulasi_sv_offus","akumulasi_sv_linkaja","akumulasi_sv_total","posisi_sv_total","akumulasi_trx_onus","akumulasi_trx_offus","akumulasi_trx_linkaja","akumulasi_trx_total","posisi_trx_total","saldo_posisi","ratas_saldo","flagging_bri_merchant","status_qris"],
    "data_time_series": ["periode","keterangan","nilai"],
    "data_ytd_giro": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_ytd_giro_kenaikan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "data_ytd_giro_penurunan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "data_ytd_tab": ["periode","kode_kanwil","kanwil","kode_kanca","kanca","kode_uker","uker","curr","currdesc","cifno","account_number","product_code","status","short_name","open_date","balance","avail_balance","limit_amount","cr_int","dr_int","commitment","avrg_balance","pn_pengelola_single_pn","pn_customer_service","pn_rm_dana","pn_rm_pinjaman","pn_rm_merchant","pn_relationship_officer","pn_sales_person","pn_pab","pn_rm_referral"],
    "data_ytd_tab_kenaikan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "data_ytd_tab_penurunan": ["norek","nama_nasabah","tgl1","tgl2","rm_pengelola"],
    "rka_avg_giro": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_avg_tab": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_deposito": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_edc_produktif": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_giro": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_qris_produktif": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_sv_edc": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_sv_qris": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"],
    "rka_tabungan": ["rm","jg","jan","feb","mar","apr","mei","jun","jul","agu","sep","okt","nov","des"]
  }'::jsonb;
  t text;
  c text;
begin
  for t in select jsonb_object_keys(spec) loop
    execute format(
      'create table if not exists public.%I (id integer generated by default as identity primary key)', t);
    for c in select jsonb_array_elements_text(spec -> t) loop
      execute format('alter table public.%I add column if not exists %I text', t, c);
    end loop;
  end loop;
end $$;

create index if not exists idx_data_qris_periode     on public.data_qris (periode);
create index if not exists idx_data_edc_periode      on public.data_edc (periode);
create index if not exists idx_di319_data1_periode   on public.data_di319_data1 (periode);
create index if not exists idx_di319_data2_periode   on public.data_di319_data2 (periode);
create index if not exists idx_di319_data3_periode   on public.data_di319_data3 (periode);

-- ------------------------------------------------------------ tabel lainnya ----
create table if not exists public.activity_logs (
  id          integer generated by default as identity primary key,
  username    text not null,
  action      text not null,
  description text not null default '',
  ip_address  text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);

create table if not exists public.links (
  id         integer generated by default as identity primary key,
  nama       text not null,
  url        text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id         integer generated by default as identity primary key,
  key        text not null unique,
  value      text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id         bigint generated by default as identity primary key,
  tanggal    date not null,
  judul      text not null,
  warna      text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_notes (
  id         bigint generated by default as identity primary key,
  tanggal    date not null,
  nasabah    text,
  catatan    text not null default '',
  warna      text,
  username   text,
  created_at timestamptz not null default now()
);

notify pgrst, 'reload schema';
