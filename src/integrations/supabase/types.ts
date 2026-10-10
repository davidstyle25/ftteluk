export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          id: number
          ip_address: string
          username: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string
          id?: number
          ip_address?: string
          username: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          id?: number
          ip_address?: string
          username?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          created_at: string
          id: number
          is_active: number
          nama: string
          password_hash: string
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: number
          nama: string
          password_hash: string
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: number
          nama?: string
          password_hash?: string
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          id: number
          judul: string
          tanggal: string
          warna: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          judul: string
          tanggal: string
          warna?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          judul?: string
          tanggal?: string
          warna?: string | null
        }
        Relationships: []
      }
      data_depo: {
        Row: {
          acctno: string | null
          cbal_base: string | null
          cur_code: string | null
          cur_desc: string | null
          fdr_srl_no: string | null
          id: number
          int_rate: string | null
          int_tenor_disp: string | null
          issue_dt: string | null
          jumlah_pn: string | null
          kode_uker: string | null
          mat_dt: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          principal_amount: string | null
          remark: string | null
          renew: string | null
          short_name: string | null
          type: string | null
          withdrawable_int: string | null
        }
        Insert: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Update: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Relationships: []
      }
      data_depo_data1: {
        Row: {
          acctno: string | null
          cbal_base: string | null
          cur_code: string | null
          cur_desc: string | null
          fdr_srl_no: string | null
          id: number
          int_rate: string | null
          int_tenor_disp: string | null
          issue_dt: string | null
          jumlah_pn: string | null
          kode_uker: string | null
          mat_dt: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          principal_amount: string | null
          remark: string | null
          renew: string | null
          short_name: string | null
          type: string | null
          withdrawable_int: string | null
        }
        Insert: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Update: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Relationships: []
      }
      data_depo_data2: {
        Row: {
          acctno: string | null
          cbal_base: string | null
          cur_code: string | null
          cur_desc: string | null
          fdr_srl_no: string | null
          id: number
          int_rate: string | null
          int_tenor_disp: string | null
          issue_dt: string | null
          jumlah_pn: string | null
          kode_uker: string | null
          mat_dt: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          principal_amount: string | null
          remark: string | null
          renew: string | null
          short_name: string | null
          type: string | null
          withdrawable_int: string | null
        }
        Insert: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Update: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Relationships: []
      }
      data_depo_data3: {
        Row: {
          acctno: string | null
          cbal_base: string | null
          cur_code: string | null
          cur_desc: string | null
          fdr_srl_no: string | null
          id: number
          int_rate: string | null
          int_tenor_disp: string | null
          issue_dt: string | null
          jumlah_pn: string | null
          kode_uker: string | null
          mat_dt: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          principal_amount: string | null
          remark: string | null
          renew: string | null
          short_name: string | null
          type: string | null
          withdrawable_int: string | null
        }
        Insert: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Update: {
          acctno?: string | null
          cbal_base?: string | null
          cur_code?: string | null
          cur_desc?: string | null
          fdr_srl_no?: string | null
          id?: number
          int_rate?: string | null
          int_tenor_disp?: string | null
          issue_dt?: string | null
          jumlah_pn?: string | null
          kode_uker?: string | null
          mat_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          principal_amount?: string | null
          remark?: string | null
          renew?: string | null
          short_name?: string | null
          type?: string | null
          withdrawable_int?: string | null
        }
        Relationships: []
      }
      data_di319_data1: {
        Row: {
          account_number: string | null
          accrued_int: string | null
          average_balance: string | null
          balance: string | null
          balance_dalam_idr: string | null
          ciff_no: string | null
          curr_code: string | null
          curr_desc: string | null
          id: number
          in_balance: string | null
          jumlah_pn_pemasar: string | null
          open_dt: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_singlepn: string | null
          pn_relationship_officer_rm_kredit_menengah: string | null
          pn_rm_dana_mantri: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          prod_code: string | null
          short_name: string | null
          uker_code: string | null
        }
        Insert: {
          account_number?: string | null
          accrued_int?: string | null
          average_balance?: string | null
          balance?: string | null
          balance_dalam_idr?: string | null
          ciff_no?: string | null
          curr_code?: string | null
          curr_desc?: string | null
          id?: number
          in_balance?: string | null
          jumlah_pn_pemasar?: string | null
          open_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_singlepn?: string | null
          pn_relationship_officer_rm_kredit_menengah?: string | null
          pn_rm_dana_mantri?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          prod_code?: string | null
          short_name?: string | null
          uker_code?: string | null
        }
        Update: {
          account_number?: string | null
          accrued_int?: string | null
          average_balance?: string | null
          balance?: string | null
          balance_dalam_idr?: string | null
          ciff_no?: string | null
          curr_code?: string | null
          curr_desc?: string | null
          id?: number
          in_balance?: string | null
          jumlah_pn_pemasar?: string | null
          open_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_singlepn?: string | null
          pn_relationship_officer_rm_kredit_menengah?: string | null
          pn_rm_dana_mantri?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          prod_code?: string | null
          short_name?: string | null
          uker_code?: string | null
        }
        Relationships: []
      }
      data_di319_data2: {
        Row: {
          account_number: string | null
          accrued_int: string | null
          average_balance: string | null
          balance: string | null
          balance_dalam_idr: string | null
          ciff_no: string | null
          curr_code: string | null
          curr_desc: string | null
          id: number
          in_balance: string | null
          jumlah_pn_pemasar: string | null
          open_dt: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_singlepn: string | null
          pn_relationship_officer_rm_kredit_menengah: string | null
          pn_rm_dana_mantri: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          prod_code: string | null
          short_name: string | null
          uker_code: string | null
        }
        Insert: {
          account_number?: string | null
          accrued_int?: string | null
          average_balance?: string | null
          balance?: string | null
          balance_dalam_idr?: string | null
          ciff_no?: string | null
          curr_code?: string | null
          curr_desc?: string | null
          id?: number
          in_balance?: string | null
          jumlah_pn_pemasar?: string | null
          open_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_singlepn?: string | null
          pn_relationship_officer_rm_kredit_menengah?: string | null
          pn_rm_dana_mantri?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          prod_code?: string | null
          short_name?: string | null
          uker_code?: string | null
        }
        Update: {
          account_number?: string | null
          accrued_int?: string | null
          average_balance?: string | null
          balance?: string | null
          balance_dalam_idr?: string | null
          ciff_no?: string | null
          curr_code?: string | null
          curr_desc?: string | null
          id?: number
          in_balance?: string | null
          jumlah_pn_pemasar?: string | null
          open_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_singlepn?: string | null
          pn_relationship_officer_rm_kredit_menengah?: string | null
          pn_rm_dana_mantri?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          prod_code?: string | null
          short_name?: string | null
          uker_code?: string | null
        }
        Relationships: []
      }
      data_di319_data3: {
        Row: {
          account_number: string | null
          accrued_int: string | null
          average_balance: string | null
          balance: string | null
          balance_dalam_idr: string | null
          ciff_no: string | null
          curr_code: string | null
          curr_desc: string | null
          id: number
          in_balance: string | null
          jumlah_pn_pemasar: string | null
          open_dt: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_singlepn: string | null
          pn_relationship_officer_rm_kredit_menengah: string | null
          pn_rm_dana_mantri: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          prod_code: string | null
          short_name: string | null
          uker_code: string | null
        }
        Insert: {
          account_number?: string | null
          accrued_int?: string | null
          average_balance?: string | null
          balance?: string | null
          balance_dalam_idr?: string | null
          ciff_no?: string | null
          curr_code?: string | null
          curr_desc?: string | null
          id?: number
          in_balance?: string | null
          jumlah_pn_pemasar?: string | null
          open_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_singlepn?: string | null
          pn_relationship_officer_rm_kredit_menengah?: string | null
          pn_rm_dana_mantri?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          prod_code?: string | null
          short_name?: string | null
          uker_code?: string | null
        }
        Update: {
          account_number?: string | null
          accrued_int?: string | null
          average_balance?: string | null
          balance?: string | null
          balance_dalam_idr?: string | null
          ciff_no?: string | null
          curr_code?: string | null
          curr_desc?: string | null
          id?: number
          in_balance?: string | null
          jumlah_pn_pemasar?: string | null
          open_dt?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_singlepn?: string | null
          pn_relationship_officer_rm_kredit_menengah?: string | null
          pn_rm_dana_mantri?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          prod_code?: string | null
          short_name?: string | null
          uker_code?: string | null
        }
        Relationships: []
      }
      data_di321_data1: {
        Row: {
          account_number: string | null
          avail_balance: string | null
          avrg_balance: string | null
          balance: string | null
          cifno: string | null
          commitment: string | null
          cr_int: string | null
          curr: string | null
          currdesc: string | null
          dr_int: string | null
          id: number
          kanca: string | null
          kanwil: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_uker: string | null
          limit_amount: string | null
          open_date: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_single_pn: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          product_code: string | null
          short_name: string | null
          status: string | null
          uker: string | null
        }
        Insert: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Update: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Relationships: []
      }
      data_di321_data2: {
        Row: {
          account_number: string | null
          avail_balance: string | null
          avrg_balance: string | null
          balance: string | null
          cifno: string | null
          commitment: string | null
          cr_int: string | null
          curr: string | null
          currdesc: string | null
          dr_int: string | null
          id: number
          kanca: string | null
          kanwil: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_uker: string | null
          limit_amount: string | null
          open_date: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_single_pn: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          product_code: string | null
          short_name: string | null
          status: string | null
          uker: string | null
        }
        Insert: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Update: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Relationships: []
      }
      data_di321_data3: {
        Row: {
          account_number: string | null
          avail_balance: string | null
          avrg_balance: string | null
          balance: string | null
          cifno: string | null
          commitment: string | null
          cr_int: string | null
          curr: string | null
          currdesc: string | null
          dr_int: string | null
          id: number
          kanca: string | null
          kanwil: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_uker: string | null
          limit_amount: string | null
          open_date: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_single_pn: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          product_code: string | null
          short_name: string | null
          status: string | null
          uker: string | null
        }
        Insert: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Update: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Relationships: []
      }
      data_edc: {
        Row: {
          aktif_or_staging: string | null
          akumulasi_sales_volume: string | null
          akumulasi_transaksi: string | null
          alamat_merchant: string | null
          cifno: string | null
          flagging: string | null
          flagging_bri_merchant: string | null
          id: number
          jenis: string | null
          jml_transaksi: string | null
          jml_transaksi_qris: string | null
          kabupaten: string | null
          kanwil_implementor: string | null
          kanwil_nama_implementor: string | null
          kanwil_nama_pemrakarsa: string | null
          kanwil_pemrakarsa: string | null
          kartu_jml_transaksi_off_us: string | null
          kartu_jml_transaksi_on_us: string | null
          kartu_sales_volume_off_us: string | null
          kartu_sales_volume_on_us: string | null
          kecamatan: string | null
          kelurahan: string | null
          ket_mcc: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_mcc: string | null
          kode_uker: string | null
          last_available: string | null
          last_transactional: string | null
          last_utility: string | null
          mid: string | null
          nama_kanca: string | null
          nama_kanwil: string | null
          nama_merchant: string | null
          nama_uker: string | null
          nama_user_pemrakarsa: string | null
          nilai: string | null
          norek: string | null
          periode: string | null
          pn_user_pemrakarsa: string | null
          posisi: string | null
          provinsi: string | null
          ratas_saldo: string | null
          ratas_saldo_by_cif: string | null
          saldo_posisi: string | null
          saldo_posisi_by_cif: string | null
          sales_volume: string | null
          sales_volume_mid: string | null
          sales_volume_qris: string | null
          source: string | null
          status_available: string | null
          status_edc: string | null
          status_transactional: string | null
          status_utility: string | null
          tahun: string | null
          tgl_approval: string | null
          tid: string | null
          tiering_sales_volume: string | null
          uker_implementor: string | null
          uker_nama_implementor: string | null
          uker_nama_pemrakarsa: string | null
          uker_pemrakarsa: string | null
        }
        Insert: {
          aktif_or_staging?: string | null
          akumulasi_sales_volume?: string | null
          akumulasi_transaksi?: string | null
          alamat_merchant?: string | null
          cifno?: string | null
          flagging?: string | null
          flagging_bri_merchant?: string | null
          id?: number
          jenis?: string | null
          jml_transaksi?: string | null
          jml_transaksi_qris?: string | null
          kabupaten?: string | null
          kanwil_implementor?: string | null
          kanwil_nama_implementor?: string | null
          kanwil_nama_pemrakarsa?: string | null
          kanwil_pemrakarsa?: string | null
          kartu_jml_transaksi_off_us?: string | null
          kartu_jml_transaksi_on_us?: string | null
          kartu_sales_volume_off_us?: string | null
          kartu_sales_volume_on_us?: string | null
          kecamatan?: string | null
          kelurahan?: string | null
          ket_mcc?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_mcc?: string | null
          kode_uker?: string | null
          last_available?: string | null
          last_transactional?: string | null
          last_utility?: string | null
          mid?: string | null
          nama_kanca?: string | null
          nama_kanwil?: string | null
          nama_merchant?: string | null
          nama_uker?: string | null
          nama_user_pemrakarsa?: string | null
          nilai?: string | null
          norek?: string | null
          periode?: string | null
          pn_user_pemrakarsa?: string | null
          posisi?: string | null
          provinsi?: string | null
          ratas_saldo?: string | null
          ratas_saldo_by_cif?: string | null
          saldo_posisi?: string | null
          saldo_posisi_by_cif?: string | null
          sales_volume?: string | null
          sales_volume_mid?: string | null
          sales_volume_qris?: string | null
          source?: string | null
          status_available?: string | null
          status_edc?: string | null
          status_transactional?: string | null
          status_utility?: string | null
          tahun?: string | null
          tgl_approval?: string | null
          tid?: string | null
          tiering_sales_volume?: string | null
          uker_implementor?: string | null
          uker_nama_implementor?: string | null
          uker_nama_pemrakarsa?: string | null
          uker_pemrakarsa?: string | null
        }
        Update: {
          aktif_or_staging?: string | null
          akumulasi_sales_volume?: string | null
          akumulasi_transaksi?: string | null
          alamat_merchant?: string | null
          cifno?: string | null
          flagging?: string | null
          flagging_bri_merchant?: string | null
          id?: number
          jenis?: string | null
          jml_transaksi?: string | null
          jml_transaksi_qris?: string | null
          kabupaten?: string | null
          kanwil_implementor?: string | null
          kanwil_nama_implementor?: string | null
          kanwil_nama_pemrakarsa?: string | null
          kanwil_pemrakarsa?: string | null
          kartu_jml_transaksi_off_us?: string | null
          kartu_jml_transaksi_on_us?: string | null
          kartu_sales_volume_off_us?: string | null
          kartu_sales_volume_on_us?: string | null
          kecamatan?: string | null
          kelurahan?: string | null
          ket_mcc?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_mcc?: string | null
          kode_uker?: string | null
          last_available?: string | null
          last_transactional?: string | null
          last_utility?: string | null
          mid?: string | null
          nama_kanca?: string | null
          nama_kanwil?: string | null
          nama_merchant?: string | null
          nama_uker?: string | null
          nama_user_pemrakarsa?: string | null
          nilai?: string | null
          norek?: string | null
          periode?: string | null
          pn_user_pemrakarsa?: string | null
          posisi?: string | null
          provinsi?: string | null
          ratas_saldo?: string | null
          ratas_saldo_by_cif?: string | null
          saldo_posisi?: string | null
          saldo_posisi_by_cif?: string | null
          sales_volume?: string | null
          sales_volume_mid?: string | null
          sales_volume_qris?: string | null
          source?: string | null
          status_available?: string | null
          status_edc?: string | null
          status_transactional?: string | null
          status_utility?: string | null
          tahun?: string | null
          tgl_approval?: string | null
          tid?: string | null
          tiering_sales_volume?: string | null
          uker_implementor?: string | null
          uker_nama_implementor?: string | null
          uker_nama_pemrakarsa?: string | null
          uker_pemrakarsa?: string | null
        }
        Relationships: []
      }
      data_mtd_giro: {
        Row: {
          account_number: string | null
          avail_balance: string | null
          avrg_balance: string | null
          balance: string | null
          cifno: string | null
          commitment: string | null
          cr_int: string | null
          curr: string | null
          currdesc: string | null
          dr_int: string | null
          id: number
          kanca: string | null
          kanwil: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_uker: string | null
          limit_amount: string | null
          open_date: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_single_pn: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          product_code: string | null
          short_name: string | null
          status: string | null
          uker: string | null
        }
        Insert: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Update: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Relationships: []
      }
      data_mtd_giro_kenaikan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      data_mtd_giro_penurunan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      data_mtd_tab: {
        Row: {
          account_number: string | null
          avail_balance: string | null
          avrg_balance: string | null
          balance: string | null
          cifno: string | null
          commitment: string | null
          cr_int: string | null
          curr: string | null
          currdesc: string | null
          dr_int: string | null
          id: number
          kanca: string | null
          kanwil: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_uker: string | null
          limit_amount: string | null
          open_date: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_single_pn: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          product_code: string | null
          short_name: string | null
          status: string | null
          uker: string | null
        }
        Insert: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Update: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Relationships: []
      }
      data_mtd_tab_kenaikan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      data_mtd_tab_penurunan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      data_pic_jalan: {
        Row: {
          edc_bri: string | null
          edc_lain: string | null
          follow_up_terakhir: string | null
          id: number
          keterangan: string | null
          nama_jalan: string | null
          nama_rmft: string | null
          nama_toko: string | null
          no_urut: string | null
          owner: string | null
          qris_bri: string | null
          qris_lain: string | null
          rek_bri: string | null
          rek_lain: string | null
          telpon: string | null
          unit_kerja: string | null
          usaha: string | null
        }
        Insert: {
          edc_bri?: string | null
          edc_lain?: string | null
          follow_up_terakhir?: string | null
          id?: number
          keterangan?: string | null
          nama_jalan?: string | null
          nama_rmft?: string | null
          nama_toko?: string | null
          no_urut?: string | null
          owner?: string | null
          qris_bri?: string | null
          qris_lain?: string | null
          rek_bri?: string | null
          rek_lain?: string | null
          telpon?: string | null
          unit_kerja?: string | null
          usaha?: string | null
        }
        Update: {
          edc_bri?: string | null
          edc_lain?: string | null
          follow_up_terakhir?: string | null
          id?: number
          keterangan?: string | null
          nama_jalan?: string | null
          nama_rmft?: string | null
          nama_toko?: string | null
          no_urut?: string | null
          owner?: string | null
          qris_bri?: string | null
          qris_lain?: string | null
          rek_bri?: string | null
          rek_lain?: string | null
          telpon?: string | null
          unit_kerja?: string | null
          usaha?: string | null
        }
        Relationships: []
      }
      data_pivot_multi: {
        Row: {
          auxtrc: string | null
          desk_transaksi: string | null
          glsign: string | null
          id: number
          jam_transaksi: string | null
          jenis_rekening: string | null
          kode_transaksi: string | null
          mutasi_debet: string | null
          mutasi_kredit: string | null
          nama: string | null
          no_rek: string | null
          saldo_akhir_mutasi: string | null
          saldo_awal_mutasi: string | null
          seq: string | null
          tanggal_transaksi: string | null
          truser: string | null
          uker_desc_tran: string | null
          uker_tran: string | null
          valuta: string | null
        }
        Insert: {
          auxtrc?: string | null
          desk_transaksi?: string | null
          glsign?: string | null
          id?: number
          jam_transaksi?: string | null
          jenis_rekening?: string | null
          kode_transaksi?: string | null
          mutasi_debet?: string | null
          mutasi_kredit?: string | null
          nama?: string | null
          no_rek?: string | null
          saldo_akhir_mutasi?: string | null
          saldo_awal_mutasi?: string | null
          seq?: string | null
          tanggal_transaksi?: string | null
          truser?: string | null
          uker_desc_tran?: string | null
          uker_tran?: string | null
          valuta?: string | null
        }
        Update: {
          auxtrc?: string | null
          desk_transaksi?: string | null
          glsign?: string | null
          id?: number
          jam_transaksi?: string | null
          jenis_rekening?: string | null
          kode_transaksi?: string | null
          mutasi_debet?: string | null
          mutasi_kredit?: string | null
          nama?: string | null
          no_rek?: string | null
          saldo_akhir_mutasi?: string | null
          saldo_awal_mutasi?: string | null
          seq?: string | null
          tanggal_transaksi?: string | null
          truser?: string | null
          uker_desc_tran?: string | null
          uker_tran?: string | null
          valuta?: string | null
        }
        Relationships: []
      }
      data_produktivitas_rmft: {
        Row: {
          dpk: string | null
          id: number
          rm: string | null
          tgl1: string | null
          tgl2: string | null
          tgl3: string | null
        }
        Insert: {
          dpk?: string | null
          id?: number
          rm?: string | null
          tgl1?: string | null
          tgl2?: string | null
          tgl3?: string | null
        }
        Update: {
          dpk?: string | null
          id?: number
          rm?: string | null
          tgl1?: string | null
          tgl2?: string | null
          tgl3?: string | null
        }
        Relationships: []
      }
      data_qris: {
        Row: {
          akumulasi_sv_linkaja: string | null
          akumulasi_sv_offus: string | null
          akumulasi_sv_onus: string | null
          akumulasi_sv_total: string | null
          akumulasi_trx_linkaja: string | null
          akumulasi_trx_offus: string | null
          akumulasi_trx_onus: string | null
          akumulasi_trx_total: string | null
          alamat: string | null
          branch: string | null
          brdesc: string | null
          cif: string | null
          flagging_bri_merchant: string | null
          id: number
          jabatan: string | null
          jenis_usaha: string | null
          kode_mcc: string | null
          kode_pos: string | null
          kota: string | null
          kriteria: string | null
          mainbr: string | null
          mbdesc: string | null
          mcc: string | null
          merchant_pan: string | null
          merchant_type: string | null
          nama_merchant: string | null
          no_rek: string | null
          periode: string | null
          pn: string | null
          pn_pemrakasa: string | null
          posisi: string | null
          posisi_sv_total: string | null
          posisi_trx_total: string | null
          provinsi: string | null
          ratas_saldo: string | null
          region: string | null
          rgdesc: string | null
          saldo_posisi: string | null
          status: string | null
          status_qris: string | null
          storeid: string | null
          tgl_balikan_pten: string | null
          x: string | null
        }
        Insert: {
          akumulasi_sv_linkaja?: string | null
          akumulasi_sv_offus?: string | null
          akumulasi_sv_onus?: string | null
          akumulasi_sv_total?: string | null
          akumulasi_trx_linkaja?: string | null
          akumulasi_trx_offus?: string | null
          akumulasi_trx_onus?: string | null
          akumulasi_trx_total?: string | null
          alamat?: string | null
          branch?: string | null
          brdesc?: string | null
          cif?: string | null
          flagging_bri_merchant?: string | null
          id?: number
          jabatan?: string | null
          jenis_usaha?: string | null
          kode_mcc?: string | null
          kode_pos?: string | null
          kota?: string | null
          kriteria?: string | null
          mainbr?: string | null
          mbdesc?: string | null
          mcc?: string | null
          merchant_pan?: string | null
          merchant_type?: string | null
          nama_merchant?: string | null
          no_rek?: string | null
          periode?: string | null
          pn?: string | null
          pn_pemrakasa?: string | null
          posisi?: string | null
          posisi_sv_total?: string | null
          posisi_trx_total?: string | null
          provinsi?: string | null
          ratas_saldo?: string | null
          region?: string | null
          rgdesc?: string | null
          saldo_posisi?: string | null
          status?: string | null
          status_qris?: string | null
          storeid?: string | null
          tgl_balikan_pten?: string | null
          x?: string | null
        }
        Update: {
          akumulasi_sv_linkaja?: string | null
          akumulasi_sv_offus?: string | null
          akumulasi_sv_onus?: string | null
          akumulasi_sv_total?: string | null
          akumulasi_trx_linkaja?: string | null
          akumulasi_trx_offus?: string | null
          akumulasi_trx_onus?: string | null
          akumulasi_trx_total?: string | null
          alamat?: string | null
          branch?: string | null
          brdesc?: string | null
          cif?: string | null
          flagging_bri_merchant?: string | null
          id?: number
          jabatan?: string | null
          jenis_usaha?: string | null
          kode_mcc?: string | null
          kode_pos?: string | null
          kota?: string | null
          kriteria?: string | null
          mainbr?: string | null
          mbdesc?: string | null
          mcc?: string | null
          merchant_pan?: string | null
          merchant_type?: string | null
          nama_merchant?: string | null
          no_rek?: string | null
          periode?: string | null
          pn?: string | null
          pn_pemrakasa?: string | null
          posisi?: string | null
          posisi_sv_total?: string | null
          posisi_trx_total?: string | null
          provinsi?: string | null
          ratas_saldo?: string | null
          region?: string | null
          rgdesc?: string | null
          saldo_posisi?: string | null
          status?: string | null
          status_qris?: string | null
          storeid?: string | null
          tgl_balikan_pten?: string | null
          x?: string | null
        }
        Relationships: []
      }
      data_ytd_giro: {
        Row: {
          account_number: string | null
          avail_balance: string | null
          avrg_balance: string | null
          balance: string | null
          cifno: string | null
          commitment: string | null
          cr_int: string | null
          curr: string | null
          currdesc: string | null
          dr_int: string | null
          id: number
          kanca: string | null
          kanwil: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_uker: string | null
          limit_amount: string | null
          open_date: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_single_pn: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          product_code: string | null
          short_name: string | null
          status: string | null
          uker: string | null
        }
        Insert: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Update: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Relationships: []
      }
      data_ytd_giro_kenaikan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      data_ytd_giro_penurunan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      data_ytd_tab: {
        Row: {
          account_number: string | null
          avail_balance: string | null
          avrg_balance: string | null
          balance: string | null
          cifno: string | null
          commitment: string | null
          cr_int: string | null
          curr: string | null
          currdesc: string | null
          dr_int: string | null
          id: number
          kanca: string | null
          kanwil: string | null
          kode_kanca: string | null
          kode_kanwil: string | null
          kode_uker: string | null
          limit_amount: string | null
          open_date: string | null
          periode: string | null
          pn_customer_service: string | null
          pn_pab: string | null
          pn_pengelola_single_pn: string | null
          pn_relationship_officer: string | null
          pn_rm_dana: string | null
          pn_rm_merchant: string | null
          pn_rm_pinjaman: string | null
          pn_rm_referral: string | null
          pn_sales_person: string | null
          product_code: string | null
          short_name: string | null
          status: string | null
          uker: string | null
        }
        Insert: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Update: {
          account_number?: string | null
          avail_balance?: string | null
          avrg_balance?: string | null
          balance?: string | null
          cifno?: string | null
          commitment?: string | null
          cr_int?: string | null
          curr?: string | null
          currdesc?: string | null
          dr_int?: string | null
          id?: number
          kanca?: string | null
          kanwil?: string | null
          kode_kanca?: string | null
          kode_kanwil?: string | null
          kode_uker?: string | null
          limit_amount?: string | null
          open_date?: string | null
          periode?: string | null
          pn_customer_service?: string | null
          pn_pab?: string | null
          pn_pengelola_single_pn?: string | null
          pn_relationship_officer?: string | null
          pn_rm_dana?: string | null
          pn_rm_merchant?: string | null
          pn_rm_pinjaman?: string | null
          pn_rm_referral?: string | null
          pn_sales_person?: string | null
          product_code?: string | null
          short_name?: string | null
          status?: string | null
          uker?: string | null
        }
        Relationships: []
      }
      data_ytd_tab_kenaikan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      data_ytd_tab_penurunan: {
        Row: {
          id: number
          nama_nasabah: string | null
          norek: string | null
          rm_pengelola: string | null
          tgl1: string | null
          tgl2: string | null
        }
        Insert: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Update: {
          id?: number
          nama_nasabah?: string | null
          norek?: string | null
          rm_pengelola?: string | null
          tgl1?: string | null
          tgl2?: string | null
        }
        Relationships: []
      }
      links: {
        Row: {
          created_at: string
          id: number
          nama: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: number
          nama: string
          url: string
        }
        Update: {
          created_at?: string
          id?: number
          nama?: string
          url?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: number
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: number
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      run_compare: { Args: { _kind: string }; Returns: Json }
      field_value_counts: {
        Args: { _table: string; _field: string }
        Returns: { value: string | null; count: number }[]
      }
      field_zero_count: { Args: { _table: string }; Returns: number }
      field_rows: {
        Args: { _table: string; _field: string; _value?: string | null }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "viewer"],
    },
  },
} as const
