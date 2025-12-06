export interface Product {
  id: string;
  dongvan_id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string | null;
  quantity: number;
  total_price: number;
  status: string;
  mail_data: MailData[] | unknown | null;
  created_at: string;
  product?: Product;
}

export interface MailData {
  email: string;
  password: string;
  refresh_token?: string;
  client_id?: string;
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_id: string | null;
  payment_status: string;
  pay_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface DongVanProduct {
  id: number;
  name: string;
  quality: number;
  price: number;
}

export interface DongVanBuyResponse {
  error_code: number;
  status: boolean;
  message: string;
  data: {
    order_code: string;
    account_type: string;
    quality: number;
    price: number;
    total_amount: number;
    balance: number;
    list_data: string[];
  };
}

export interface MailMessage {
  uid: number;
  date: string;
  from: { name: string; address: string }[];
  subject: string;
  code: string;
  message: string;
}

export interface NOWPaymentInvoice {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  price_amount: number;
  price_currency: string;
}
