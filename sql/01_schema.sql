-- =====================================================================
-- 01_schema.sql  |  The Competition Discount
-- One row = one US city-pair route in one quarter (DOT Table 6, 2019Q1-2026Q1)
-- Grain: (route_id, period_index) is unique
-- =====================================================================

drop table if exists public.route_quarters;

create table public.route_quarters (
    -- identity and time
    route_id             text      not null,  -- "citymarketid_1-citymarketid_2"; an identifier, so text, not a number
    period               text      not null,  -- e.g. '2025Q4', for display
    year                 smallint  not null,
    quarter              smallint  not null check (quarter between 1 and 4),
    period_index         integer   not null,  -- year*4 + quarter - 1: consecutive quarters differ by exactly 1
    citymarketid_1       text      not null,
    citymarketid_2       text      not null,
    city1                text      not null,
    city2                text      not null,

    -- route size and price
    nsmiles              integer   not null check (nsmiles > 0),        -- nonstop distance, miles
    distance_band        text      not null,                            -- '0-500', '500-1000', '1000-1500', '1500+'
    passengers           numeric   not null check (passengers > 0),     -- average passengers per day
    fare                 numeric   not null check (fare > 0),           -- average one-way fare, USD
    fare_per_mile        numeric   not null,                            -- yield = fare / nsmiles

    -- dominant airline (largest market share)
    carrier_lg           text      not null,
    carrier_lg_name      text,
    lg_group             text      not null,                            -- full_service / low_cost / hybrid / regional_other
    large_ms             numeric   not null check (large_ms between 0 and 1),
    fare_lg              numeric   not null,

    -- cheapest airline (lowest average fare)
    carrier_low          text      not null,
    carrier_low_name     text,
    low_group            text      not null,
    lf_ms                numeric   not null check (lf_ms between 0 and 1),
    fare_low             numeric   not null,

    -- flags and estimates
    lcc_present          boolean   not null,  -- cheapest airline is on the main low-cost list
    lcc_present_incl_b6  boolean   not null,  -- same, with JetBlue counted as low-cost (sensitivity check)
    covid_flag           boolean   not null,  -- 2020-2021
    days_in_quarter      smallint  not null,
    est_route_rev_q      numeric   not null,  -- passengers x days x fare (whole route)
    est_dominant_rev_q   numeric   not null,  -- passengers x large_ms x days x fare_lg (dominant airline only)

    primary key (route_id, period_index)      -- enforces the grain: one row per route per quarter
);

-- Most queries filter or group by quarter and distance band
create index idx_rq_period on public.route_quarters (period_index);
create index idx_rq_band_period on public.route_quarters (distance_band, period_index);

-- Security: the RouteIQ app reads static files, not this database.
-- Turning on row level security with no policies keeps the table closed to Supabase's public API.
alter table public.route_quarters enable row level security;
