-- Push notification subscriptions (Web Push API)
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Employees manage their own subscriptions
create policy "users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Managers can read subscriptions (to send push notifications server-side)
create policy "service role reads all push subscriptions"
  on public.push_subscriptions
  for select
  using (true);
