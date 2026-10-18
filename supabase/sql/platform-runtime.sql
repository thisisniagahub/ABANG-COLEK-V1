-- Bounded compatibility store: private SQLite bytes, never browser-accessible.
begin;
create table if not exists public.platform_runtime_snapshots (
  workspace text primary key check (workspace ~ '^[a-zA-Z0-9_-]{1,120}$'),
  revision bigint not null check (revision > 0),
  payload bytea not null check (octet_length(payload) between 1 and 16777216),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);
create table if not exists public.platform_runtime_commits (
  workspace text not null references public.platform_runtime_snapshots(workspace),
  commit_id uuid not null,
  revision bigint not null,
  sha256 text not null,
  created_at timestamptz not null default now(),
  primary key(workspace,commit_id)
);
create index if not exists platform_runtime_commits_created_at on public.platform_runtime_commits(created_at);
alter table public.platform_runtime_snapshots enable row level security;
alter table public.platform_runtime_commits enable row level security;
revoke all on public.platform_runtime_snapshots,public.platform_runtime_commits from public,anon,authenticated;
grant select,insert,update on public.platform_runtime_snapshots to service_role;
grant select,insert,delete on public.platform_runtime_commits to service_role;

create or replace function public.platform_runtime_load(p_workspace text)
returns jsonb language sql security invoker set search_path = '' as $$
  select coalesce((select jsonb_build_object('revision',revision,'payload',encode(payload,'hex'),'sha256',sha256)
    from public.platform_runtime_snapshots where workspace=p_workspace),jsonb_build_object('revision',0,'payload',null));
$$;

create or replace function public.platform_runtime_receipt(p_workspace text,p_commit_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select coalesce((select jsonb_build_object('committed',true,'sha256',sha256)
    from public.platform_runtime_commits where workspace=p_workspace and commit_id=p_commit_id),jsonb_build_object('committed',false));
$$;

create or replace function public.platform_runtime_commit(p_workspace text,p_expected_revision bigint,p_payload text,p_sha256 text,p_commit_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  current_revision bigint;
  prior_hash text;
  decoded bytea;
begin
  if p_workspace is null or p_workspace !~ '^[a-zA-Z0-9_-]{1,120}$' or p_expected_revision is null or p_expected_revision<0
    or p_payload is null or length(p_payload)>33554432 or p_payload !~ '^([a-f0-9]{2})+$'
    or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$' or p_commit_id is null then
    raise exception 'Invalid snapshot input' using errcode='22023';
  end if;
  decoded:=decode(p_payload,'hex');
  if encode(sha256(decoded),'hex')<>p_sha256 then raise exception 'Snapshot checksum mismatch' using errcode='22023';end if;
  -- Serializes initialization and CAS for this workspace, including when no row exists.
  perform pg_advisory_xact_lock(hashtextextended(p_workspace,0));
  select sha256 into prior_hash from public.platform_runtime_commits where workspace=p_workspace and commit_id=p_commit_id;
  if found then
    if prior_hash<>p_sha256 then raise exception 'Commit identifier reused' using errcode='22023';end if;
    return jsonb_build_object('committed',true);
  end if;
  select revision into current_revision from public.platform_runtime_snapshots where workspace=p_workspace for update;
  if coalesce(current_revision,0)<>p_expected_revision then return jsonb_build_object('committed',false);end if;
  insert into public.platform_runtime_snapshots(workspace,revision,payload,sha256)
    values(p_workspace,p_expected_revision+1,decoded,p_sha256)
    on conflict(workspace) do update set revision=excluded.revision,payload=excluded.payload,sha256=excluded.sha256,updated_at=now();
  insert into public.platform_runtime_commits(workspace,commit_id,revision,sha256) values(p_workspace,p_commit_id,p_expected_revision+1,p_sha256);
  -- Receipts outlive request timeouts but must not grow indefinitely.
  delete from public.platform_runtime_commits where created_at<now()-interval '24 hours';
  return jsonb_build_object('committed',true);
end;
$$;

revoke all on function public.platform_runtime_load(text),public.platform_runtime_receipt(text,uuid),public.platform_runtime_commit(text,bigint,text,text,uuid) from public,anon,authenticated;
grant execute on function public.platform_runtime_load(text),public.platform_runtime_receipt(text,uuid),public.platform_runtime_commit(text,bigint,text,text,uuid) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('platform-evidence','platform-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Restrictive policy also defeats unrelated permissive policies that allow every bucket.
drop policy if exists platform_evidence_server_only on storage.objects;
create policy platform_evidence_server_only on storage.objects as restrictive
  for all to anon,authenticated
  using (bucket_id<>'platform-evidence')
  with check (bucket_id<>'platform-evidence');
commit;
