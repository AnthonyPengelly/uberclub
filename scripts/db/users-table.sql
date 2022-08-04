-- Create public profile table that references our auth.user
create table public.profiles (
  id uuid references auth.users not null,
  created_at timestamptz not null default current_timestamp,
  email varchar not null,

  primary key (id)
);


-- inserts a row into public.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.user;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();