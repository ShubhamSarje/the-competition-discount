-- =====================================================================
-- 04_entry_events.sql  |  The Competition Discount
-- Business question 2, part 1: find the moments a low-cost airline
-- became the cheapest option on a route.
--
-- An ENTRY EVENT (route r, quarter t) must pass every rule:
--   1. Quarter t:      the cheapest airline is low-cost                    (lcc_present)
--   2. Quarter t-1:    it was not                                          (LAG)
--   3. Quarter t+1:    it still is, so it stays at least 2 quarters        (LEAD)
--   4. t-1, t, t+1 are consecutive quarters, no gaps                      (period_index differences = 1)
--   5. Clean "before" window: t-4..t-1 all present, cheapest = full-service
--   6. Clean "after" window:  t+1..t+4 all present
--   7. No 2020-2021 (COVID) quarter anywhere in t-4..t+4
-- Wording matters: this measures a low-cost airline BECOMING THE CHEAPEST OPTION,
-- which can mean a new entry or a low-cost airline already there cutting its fares.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Part 1: the entry_events view (one row per qualifying event, with before/after averages)
-- ---------------------------------------------------------------------
create or replace view entry_events as
with seq as (
    -- One WINDOW clause, reused by four window functions: PARTITION BY route, ORDER BY time
    select
        route_id,
        period_index,
        lcc_present,
        lag(lcc_present)  over w                    as prev_lcc,
        lead(lcc_present) over w                    as next_lcc,
        period_index - lag(period_index)  over w    as gap_prev,
        lead(period_index) over w - period_index    as gap_next
    from route_quarters
    window w as (partition by route_id order by period_index)
),
candidates as (                                     -- rules 1 to 4
    select route_id, period_index as entry_q
    from seq
    where lcc_present
      and prev_lcc = false
      and next_lcc
      and gap_prev = 1
      and gap_next = 1
)
select
    c.route_id,
    c.entry_q,
    min(r.period)        filter (where r.period_index = c.entry_q)       as entry_period,
    min(r.city1)                                                          as city1,
    min(r.city2)                                                          as city2,
    min(r.distance_band)                                                  as distance_band,
    min(r.carrier_low_name) filter (where r.period_index = c.entry_q)    as low_cost_airline,
    min(r.carrier_lg_name)  filter (where r.period_index = c.entry_q - 1) as dominant_before,
    min(r.carrier_lg_name)  filter (where r.period_index = c.entry_q + 4) as dominant_after,
    count(distinct r.carrier_lg) filter (where r.period_index <> c.entry_q) as n_dominant_airlines,
    -- before (t-4..t-1) and after (t+1..t+4) averages
    avg(r.fare)               filter (where r.period_index < c.entry_q)  as pre_fare,
    avg(r.fare)               filter (where r.period_index > c.entry_q)  as post_fare,
    avg(r.passengers)         filter (where r.period_index < c.entry_q)  as pre_pax,
    avg(r.passengers)         filter (where r.period_index > c.entry_q)  as post_pax,
    avg(r.large_ms)           filter (where r.period_index < c.entry_q)  as pre_dominant_share,
    avg(r.large_ms)           filter (where r.period_index > c.entry_q)  as post_dominant_share,
    avg(r.est_route_rev_q)    filter (where r.period_index < c.entry_q)  as pre_route_rev,
    avg(r.est_route_rev_q)    filter (where r.period_index > c.entry_q)  as post_route_rev,
    avg(r.est_dominant_rev_q) filter (where r.period_index < c.entry_q)  as pre_dominant_rev,
    avg(r.est_dominant_rev_q) filter (where r.period_index > c.entry_q)  as post_dominant_rev
from candidates c
join route_quarters r
  on r.route_id = c.route_id
 and r.period_index between c.entry_q - 4 and c.entry_q + 4
group by c.route_id, c.entry_q
having count(*) filter (where r.period_index < c.entry_q and r.low_group = 'full_service') = 4   -- rule 5
   and count(*) filter (where r.period_index > c.entry_q) = 4                                    -- rule 6
   and not bool_or(r.covid_flag);                                                                 -- rule 7


-- ---------------------------------------------------------------------
-- Part 2: how many candidates survive the rules, and what happened to the top airline?
-- Result: 4,649 times the cheapest airline switched to a low-cost one and stayed 2 quarters;
--         193 pass the clean 4-before / 4-after rules (entries 2023Q1 to 2025Q1).
--         Sensitivity: a looser 2-before / 2-after window keeps 814.
--   Same dominant airline in all 8 quarters:            89 of 193
--   Dominant airline different a year later (t+4):      62 of 193 (32%)
--   The low-cost airline itself is dominant by t+4:     34 of 193 (18%)
-- ---------------------------------------------------------------------
select
    count(*)                                                     as clean_entry_events,
    min(entry_period)                                            as first_entry,
    max(entry_period)                                            as last_entry,
    count(*) filter (where n_dominant_airlines = 1)              as same_dominant_all_8_quarters,
    count(*) filter (where dominant_after <> dominant_before)    as dominant_changed_by_t4,
    count(*) filter (where dominant_after = low_cost_airline)    as low_cost_became_dominant_by_t4
from entry_events;


-- Which low-cost airlines drive the entries?
-- Result: Southwest 97, Breeze 26, Frontier 24, Allegiant 16, Avelo 13, Spirit 10, Sun Country 7
select low_cost_airline, count(*) as events
from entry_events
group by low_cost_airline
order by events desc;
