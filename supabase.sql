-- NAYE Supabase project ke SQL Editor mein poora run karein
create table cities(name text primary key,fee_isb int not null,fee_rwp int not null);
create table profiles(id uuid primary key references auth.users on delete cascade,name text,phone text,city text,address text,role text not null default 'customer' check(role in('customer','user','admin')));
create table orders(id bigserial primary key,customer_id uuid references profiles(id),city text,address text,qty int,delivery_fee int,total int,
 status text default 'placed' check(status in('placed','shipped','delivered')),courier text,tracking text,created_at timestamptz default now());
create table reviews(id bigserial primary key,order_id bigint unique references orders(id),customer_id uuid references profiles(id),rating int check(rating between 1 and 5),comment text,photo_path text,created_at timestamptz default now());
alter table cities enable row level security;alter table profiles enable row level security;alter table orders enable row level security;alter table reviews enable row level security;
create function role_of() returns text language sql security definer as $$select role from profiles where id=auth.uid()$$;
create function handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into profiles(id,name,phone,city,address) values(new.id,new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'phone',new.raw_user_meta_data->>'city',new.raw_user_meta_data->>'address');return new;end$$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();
create policy c_read on cities for select using(true);
create policy p_read on profiles for select using(id=auth.uid() or role_of() in('user','admin'));
create policy o_read on orders for select using(customer_id=auth.uid() or role_of() in('user','admin'));
create policy o_ins on orders for insert with check(customer_id=auth.uid() and status='placed');
-- Update: sirf User (approve/print/khud delivery) aur Customer (apni delivery). Admin sirf dekh sakta hai.
create policy o_upd on orders for update using(customer_id=auth.uid() or role_of()='user');
create policy r_read on reviews for select using(customer_id=auth.uid() or role_of() in('user','admin'));
-- Reviews sirf Edge Function (AI photo check ke baad) insert karta hai.
insert into storage.buckets(id,name,public) values('reviews','reviews',false);
create policy rv_photo_read on storage.objects for select using(bucket_id='reviews' and (role_of() in('user','admin') or (storage.foldername(name))[1]=auth.uid()::text));
-- Delivery charges (PKR): fee_isb = Islamabad se, fee_rwp = Rawalpindi se. Apne hisab se badal lein.
insert into cities values
('Islamabad',150,200),('Rawalpindi',200,150),('Taxila',250,250),('Attock',350,350),('Murree',350,350),('Abbottabad',400,450),
('Muzaffarabad',500,500),('Mirpur',450,450),('Jhelum',400,350),('Gujrat',500,500),('Kohat',550,550),('Peshawar',600,650),
('Mardan',600,650),('Swat',800,800),('Sargodha',600,600),('Gujranwala',600,600),('Sialkot',650,650),('Lahore',700,700),
('Faisalabad',800,800),('Sahiwal',850,850),('D.I. Khan',800,800),('Multan',1000,1000),('Bahawalpur',1100,1100),
('Rahim Yar Khan',1300,1300),('Sukkur',1400,1400),('Gilgit',1500,1500),('Hyderabad',1700,1700),('Quetta',1800,1800),('Karachi',1900,1900);
-- User/Admin banane ke liye: pehle customer.html se account banayein, phir yeh chalayein:
-- update profiles set role='admin' where phone='03XXXXXXXXX';
-- update profiles set role='user' where phone='03YYYYYYYYY';
