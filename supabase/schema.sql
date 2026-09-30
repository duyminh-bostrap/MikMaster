-- MikMaster — tài khoản và dùng thử 30 ngày trên Supabase.
-- Dán toàn bộ file này vào Supabase → SQL Editor → Run. Chạy lại nhiều lần vẫn an toàn.
--
-- Quy tắc dùng thử (do máy chủ quyết định, app chỉ hỏi):
--   * mỗi TÀI KHOẢN được dùng thử một lần;
--   * mỗi MÁY (mã máy) được dùng thử một lần — tạo tài khoản khác trên cùng máy KHÔNG được thêm 30 ngày;
--   * dùng thử tính 30 ngày từ lần đầu tài khoản đăng nhập trên máy đó, và chỉ dùng được trên máy đó.
-- Gói trả phí: chèn / sửa hàng trong bảng `entitlements` (xem cuối file) — có hiệu lực trên mọi máy của tài khoản.

create table if not exists public.trials (
  machine_code text primary key,
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  started_at   timestamptz not null default now(),
  constraint machine_code_format check (machine_code ~ '^[0-9A-F]{4}(-[0-9A-F]{4}){3}$')
);

create table if not exists public.entitlements (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  paid_until timestamptz,
  note       text
);

-- Không ai (kể cả người dùng đã đăng nhập) đọc / ghi trực tiếp bảng trials; chỉ qua hai hàm bên dưới.
alter table public.trials       enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements for select using (auth.uid() = user_id);

-- Bắt đầu dùng thử cho tài khoản đang đăng nhập trên máy này (nếu được phép). Idempotent.
create or replace function public.claim_trial(p_machine text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_machine is null or p_machine !~ '^[0-9A-F]{4}(-[0-9A-F]{4}){3}$' then raise exception 'bad machine code'; end if;
  -- Tài khoản đã dùng thử (ở máy nào cũng vậy) hoặc máy đã dùng thử (bằng tài khoản nào cũng vậy) → không tạo thêm.
  if not exists (select 1 from trials where user_id = uid)
     and not exists (select 1 from trials where machine_code = p_machine) then
    insert into trials (machine_code, user_id) values (p_machine, uid);
  end if;
  return json_build_object('ok', true);
end;
$$;

-- Quyền dùng của tài khoản đang đăng nhập, tại máy này.
--   paid / trial / expired / other_machine / machine_used / none
create or replace function public.get_entitlement(p_machine text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  paid timestamptz;
  t trials%rowtype;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;

  select paid_until into paid from entitlements where user_id = uid;
  if paid is not null and paid > now() then
    return json_build_object('state', 'paid', 'expires_at', paid, 'server_now', now());
  end if;

  select * into t from trials where user_id = uid;
  if found then
    if t.machine_code <> p_machine then
      return json_build_object('state', 'other_machine', 'server_now', now());
    end if;
    return json_build_object(
      'state', case when t.started_at + interval '30 days' > now() then 'trial' else 'expired' end,
      'expires_at', t.started_at + interval '30 days',
      'server_now', now());
  end if;

  if exists (select 1 from trials where machine_code = p_machine) then
    return json_build_object('state', 'machine_used', 'server_now', now());
  end if;
  return json_build_object('state', 'none', 'server_now', now());
end;
$$;

revoke all on function public.claim_trial(text)     from public, anon;
revoke all on function public.get_entitlement(text) from public, anon;
grant execute on function public.claim_trial(text)     to authenticated;
grant execute on function public.get_entitlement(text) to authenticated;

-- ── Cấp gói trả phí cho một tài khoản (chạy tay trong SQL Editor):
--   insert into public.entitlements (user_id, paid_until, note)
--   select id, now() + interval '365 days', 'Cong ty ABC' from auth.users where email = 'khach@example.com'
--   on conflict (user_id) do update set paid_until = excluded.paid_until, note = excluded.note;
