-- =====================================================================
-- 07_robustness.sql  |  The Competition Discount
-- Do the question 2 results hold if we change the assumptions?
--   Check A: split entries by WHO became the cheapest option (Southwest vs the rest)
--   Check B: count JetBlue as low-cost (instead of "hybrid")
-- Requires: 04_entry_events.sql (entry_events view).
-- =====================================================================


-- ---------------------------------------------------------------------
-- Check A: Southwest vs ultra-low-cost airlines (Breeze, Frontier, Allegiant, Avelo, Spirit, Sun Country)
-- Result (median effects vs control routes):
--   variant          events   fare     passengers   route rev   dominant rev   incumbent rev (same leader)
--   main               193    -3.7%      +7.3%        +2.5%        -9.0%          -5.4%  (89 events)
--   excl_southwest      96   -13.5%     +26.7%        +7.7%        -9.2%          -1.5%  (33 events, thin)
--   southwest_only      97    -0.2%      -2.9%        -2.0%        -7.8%          -8.4%  (56 events)
-- Reading: two different threats. Ultra-low-cost airlines cut fares and grow the market;
-- Southwest barely moves fares but takes share. The incumbent loses revenue in both.
-- ---------------------------------------------------------------------
with entry_quarters as (
    select distinct entry_q from entry_events
),
control_routes as (
    select
        q.entry_q, r.route_id, min(r.distance_band) as distance_band,
        avg(r.fare)               filter (where r.period_index < q.entry_q) as pre_fare,
        avg(r.fare)               filter (where r.period_index > q.entry_q) as post_fare,
        avg(r.passengers)         filter (where r.period_index < q.entry_q) as pre_pax,
        avg(r.passengers)         filter (where r.period_index > q.entry_q) as post_pax,
        avg(r.est_route_rev_q)    filter (where r.period_index < q.entry_q) as pre_rev,
        avg(r.est_route_rev_q)    filter (where r.period_index > q.entry_q) as post_rev,
        avg(r.est_dominant_rev_q) filter (where r.period_index < q.entry_q) as pre_drev,
        avg(r.est_dominant_rev_q) filter (where r.period_index > q.entry_q) as post_drev
    from entry_quarters q
    join route_quarters r on r.period_index between q.entry_q - 4 and q.entry_q + 4
    group by q.entry_q, r.route_id
    having count(*) = 9 and bool_and(r.low_group = 'full_service') and not bool_or(r.covid_flag)
),
control_medians as (
    select entry_q, distance_band,
        percentile_cont(0.5) within group (order by post_fare / pre_fare - 1) as c_fare,
        percentile_cont(0.5) within group (order by post_pax / pre_pax - 1)   as c_pax,
        percentile_cont(0.5) within group (order by post_rev / pre_rev - 1)   as c_rev,
        percentile_cont(0.5) within group (order by post_drev / pre_drev - 1) as c_drev
    from control_routes
    group by entry_q, distance_band
),
scored as (
    select
        e.low_cost_airline, e.n_dominant_airlines,
        (e.post_fare / e.pre_fare - 1)                 - c.c_fare as effect_fare,
        (e.post_pax / e.pre_pax - 1)                   - c.c_pax  as effect_pax,
        (e.post_route_rev / e.pre_route_rev - 1)       - c.c_rev  as effect_route_rev,
        (e.post_dominant_rev / e.pre_dominant_rev - 1) - c.c_drev as effect_dominant_rev
    from entry_events e
    join control_medians c using (entry_q, distance_band)
)
select
    v.variant,
    count(*)                                                                                  as events,
    round(100 * percentile_cont(0.5) within group (order by effect_fare)::numeric, 1)        as fare_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_pax)::numeric, 1)         as passengers_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_route_rev)::numeric, 1)   as route_revenue_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_dominant_rev)::numeric, 1) as dominant_revenue_pct,
    count(*) filter (where n_dominant_airlines = 1)                                           as same_leader_events,
    round(100 * percentile_cont(0.5) within group (order by effect_dominant_rev)
                filter (where n_dominant_airlines = 1)::numeric, 1)                            as incumbent_revenue_pct
from scored
-- CROSS JOIN LATERAL (VALUES ...) puts each event into every variant it belongs to, in one pass
cross join lateral (values
    ('main'),
    (case when low_cost_airline <> 'Southwest Airlines' then 'excl_southwest' end),
    (case when low_cost_airline =  'Southwest Airlines' then 'southwest_only' end)
) as v(variant)
where v.variant is not null
group by v.variant
order by v.variant;


-- ---------------------------------------------------------------------
-- Check B: JetBlue counted as low-cost (lcc_present_incl_b6)
-- Result: 204 events (11 led by JetBlue); fare -3.3%, passengers +6.0%, route revenue +1.7%,
--   dominant revenue -8.1%, incumbent revenue -5.2% (93 events). Same picture as the main run.
-- ---------------------------------------------------------------------
with seq as (
    select route_id, period_index, lcc_present_incl_b6 as flag,
        lag(lcc_present_incl_b6)  over w as prev_flag,
        lead(lcc_present_incl_b6) over w as next_flag,
        period_index - lag(period_index)  over w as gap_prev,
        lead(period_index) over w - period_index as gap_next
    from route_quarters
    window w as (partition by route_id order by period_index)
),
candidates as (
    select route_id, period_index as entry_q
    from seq
    where flag and prev_flag = false and next_flag and gap_prev = 1 and gap_next = 1
),
events as (
    select
        c.route_id, c.entry_q, min(r.distance_band) as distance_band,
        count(distinct r.carrier_lg) filter (where r.period_index <> c.entry_q) as n_dominant_airlines,
        min(r.carrier_low) filter (where r.period_index = c.entry_q)          as entrant,
        avg(r.fare)               filter (where r.period_index < c.entry_q)   as pre_fare,
        avg(r.fare)               filter (where r.period_index > c.entry_q)   as post_fare,
        avg(r.passengers)         filter (where r.period_index < c.entry_q)   as pre_pax,
        avg(r.passengers)         filter (where r.period_index > c.entry_q)   as post_pax,
        avg(r.est_route_rev_q)    filter (where r.period_index < c.entry_q)   as pre_rev,
        avg(r.est_route_rev_q)    filter (where r.period_index > c.entry_q)   as post_rev,
        avg(r.est_dominant_rev_q) filter (where r.period_index < c.entry_q)   as pre_drev,
        avg(r.est_dominant_rev_q) filter (where r.period_index > c.entry_q)   as post_drev
    from candidates c
    join route_quarters r on r.route_id = c.route_id and r.period_index between c.entry_q - 4 and c.entry_q + 4
    group by c.route_id, c.entry_q
    having count(*) filter (where r.period_index < c.entry_q and r.low_group = 'full_service') = 4
       and count(*) filter (where r.period_index > c.entry_q) = 4
       and not bool_or(r.covid_flag)
),
entry_quarters as (
    select distinct entry_q from events
),
control_routes as (
    select
        q.entry_q, r.route_id, min(r.distance_band) as distance_band,
        avg(r.fare)               filter (where r.period_index < q.entry_q) as pre_fare,
        avg(r.fare)               filter (where r.period_index > q.entry_q) as post_fare,
        avg(r.passengers)         filter (where r.period_index < q.entry_q) as pre_pax,
        avg(r.passengers)         filter (where r.period_index > q.entry_q) as post_pax,
        avg(r.est_route_rev_q)    filter (where r.period_index < q.entry_q) as pre_rev,
        avg(r.est_route_rev_q)    filter (where r.period_index > q.entry_q) as post_rev,
        avg(r.est_dominant_rev_q) filter (where r.period_index < q.entry_q) as pre_drev,
        avg(r.est_dominant_rev_q) filter (where r.period_index > q.entry_q) as post_drev
    from entry_quarters q
    join route_quarters r on r.period_index between q.entry_q - 4 and q.entry_q + 4
    group by q.entry_q, r.route_id
    having count(*) = 9 and bool_and(r.low_group = 'full_service') and not bool_or(r.covid_flag)
),
control_medians as (
    select entry_q, distance_band,
        percentile_cont(0.5) within group (order by post_fare / pre_fare - 1) as c_fare,
        percentile_cont(0.5) within group (order by post_pax / pre_pax - 1)   as c_pax,
        percentile_cont(0.5) within group (order by post_rev / pre_rev - 1)   as c_rev,
        percentile_cont(0.5) within group (order by post_drev / pre_drev - 1) as c_drev
    from control_routes
    group by entry_q, distance_band
),
scored as (
    select e.*,
        (e.post_fare / e.pre_fare - 1) - c.c_fare as effect_fare,
        (e.post_pax / e.pre_pax - 1)   - c.c_pax  as effect_pax,
        (e.post_rev / e.pre_rev - 1)   - c.c_rev  as effect_route_rev,
        (e.post_drev / e.pre_drev - 1) - c.c_drev as effect_dominant_rev
    from events e
    join control_medians c using (entry_q, distance_band)
)
select
    count(*)                                                                                  as events,
    count(*) filter (where entrant = 'B6')                                                    as jetblue_events,
    round(100 * percentile_cont(0.5) within group (order by effect_fare)::numeric, 1)        as fare_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_pax)::numeric, 1)         as passengers_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_route_rev)::numeric, 1)   as route_revenue_pct,
    round(100 * percentile_cont(0.5) within group (order by effect_dominant_rev)::numeric, 1) as dominant_revenue_pct,
    count(*) filter (where n_dominant_airlines = 1)                                           as same_leader_events,
    round(100 * percentile_cont(0.5) within group (order by effect_dominant_rev)
                filter (where n_dominant_airlines = 1)::numeric, 1)                            as incumbent_revenue_pct
from scored;
