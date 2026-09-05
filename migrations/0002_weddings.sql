create table if not exists weddings (
  id text primary key,
  user_id text not null unique,
  partner_one text not null default '',
  partner_two text not null default '',
  wedding_date date,
  wedding_time text not null default '',
  venue_name text not null default '',
  venue_address text not null default '',
  venue_maps_url text not null default '',
  dress_code text not null default '',
  story text not null default '',
  welcome_note text not null default '',
  schedule jsonb not null default '[]'::jsonb,
  whatsapp_template text not null default '',
  rsvp_deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guests (
  id text primary key,
  wedding_id text not null references weddings(id) on delete cascade,
  name text not null,
  phone text not null default '',
  party_size integer not null default 1,
  group_name text not null default '',
  notes text not null default '',
  token text not null unique,
  rsvp text not null default 'unknown',
  rsvp_at timestamptz,
  sent_at timestamptz,
  first_viewed_at timestamptz,
  bound_device_id text,
  checked_in_at timestamptz,
  clone_flagged_at timestamptz,
  discarded_at timestamptz,
  scan_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists guests_wedding_id_idx on guests (wedding_id);
create index if not exists guests_token_idx on guests (token);

create table if not exists scan_events (
  id text primary key,
  guest_id text not null references guests(id) on delete cascade,
  kind text not null,
  device_id text not null default '',
  outcome text not null,
  created_at timestamptz not null default now()
);

create index if not exists scan_events_guest_id_idx on scan_events (guest_id);

insert into weddings (
  id, user_id, partner_one, partner_two, wedding_date, wedding_time,
  venue_name, venue_address, venue_maps_url, dress_code, story, welcome_note,
  schedule, whatsapp_template, rsvp_deadline
) values (
  'wd_demo',
  'demo-seed',
  'Ana',
  'Mateo',
  '2026-11-14',
  '16:00',
  'Hacienda San Gabriel',
  'Tepoztlán, Morelos',
  'https://maps.google.com/?q=Hacienda+San+Gabriel+Tepoztlan',
  'Formal de jardín. Lino, paleta tierra, sin blanco.',
  'Nos conocimos entre naranjos y decidimos volver a ellos. Esta vez, para siempre.',
  'Con el corazón abierto, queremos que este día se sienta como casa.',
  '[{"time":"16:00","title":"Ceremonia","detail":"Jardín principal"},{"time":"17:30","title":"Brindis","detail":"Terraza"},{"time":"19:00","title":"Cena","detail":"Salón de naranjos"},{"time":"21:00","title":"Baile","detail":"Hasta que el cuerpo aguante"}]'::jsonb,
  'Hola {nombre},

Con mucho cariño te invitamos a nuestra boda.

{novios}
{fecha} · {lugar}

Tu invitación personal está aquí:
{enlace}

Esperamos verte.',
  '2026-10-20'
) on conflict (id) do nothing;

insert into guests (id, wedding_id, name, phone, party_size, group_name, notes, token)
values
  ('g_demo_ana', 'wd_demo', 'Ana Ruiz', '7771234567', 2, 'Familia', 'Mesa 1', 'demo-ana'),
  ('g_demo_clone', 'wd_demo', 'Invitado de prueba (clon)', '', 1, 'Prueba', '', 'demo-clone')
on conflict (id) do nothing;
