create schema if not exists public;

create table if not exists public.gns_documents (
  kind text not null,
  document_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, document_key)
);

create index if not exists gns_documents_updated_at_idx
  on public.gns_documents (updated_at desc);
