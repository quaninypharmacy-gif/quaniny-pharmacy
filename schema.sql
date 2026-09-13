-- شغّل ده مرة واحدة في Supabase → SQL Editor
create table if not exists public.orders (
  id bigserial primary key,
  order_no text unique not null,
  kind text not null default 'shop',
  care_type text check (care_type in ('daily','monthly')),
  customer_name text not null,
  phone text not null,
  address text,
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  note text,
  refill_due_on date,
  refill_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists orders_refill_idx
  on public.orders (refill_due_on)
  where refill_due_on is not null and refill_notified_at is null;

create index if not exists orders_created_idx on public.orders (created_at desc);

-- الجدول مقفول قدام الجمهور؛ السيرفر بيستخدم service key فبيعدّي فوق RLS
alter table public.orders enable row level security;
