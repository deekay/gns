create schema if not exists public;

create table if not exists public.ont_documents (
  kind text not null,
  document_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (kind, document_key)
);

create index if not exists ont_documents_updated_at_idx
  on public.ont_documents (updated_at desc);
