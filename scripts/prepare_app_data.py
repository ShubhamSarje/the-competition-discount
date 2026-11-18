"""Compact the 3 Supabase exports into the files RouteIQ loads (public/data/)."""
import json, re, os

SRC = 'data_app'
OUT = 'routeiq/public/data'
os.makedirs(OUT, exist_ok=True)

def short(city):
    return re.sub(r'\s*\(Metropolitan Area\)', '', city)

def dump(name, obj):
    path = f'{OUT}/{name}'
    with open(path, 'w') as f:
        json.dump(obj, f, separators=(',', ':'))
    print(f'{name:<22}{os.path.getsize(path) / 1024:>8,.0f} KB')

# Routes: shorten city names, keep everything else
routes = json.load(open(f'{SRC}/routes.json'))
for r in routes:
    r['c1'], r['c2'] = short(r['c1']), short(r['c2'])
dump('routes.json', routes)

# Watchlist: short keys, rounded values. Premium taken from routes.json (4 decimals) so both screens agree.
prem_by_pair = {(r['c1'], r['c2']): r['prem'] for r in routes}
wl = json.load(open(f'{SRC}/watchlist.json'))
dump('watchlist.json', [{
    'rank': int(w['risk_rank']), 'rankAir': int(w['rank_within_airline']),
    'c1': short(w['city1']), 'c2': short(w['city2']), 'band': w['distance_band'], 'mi': int(w['nsmiles']),
    'pax': round(w['passengers'], 1), 'air': w['dominant_airline'], 'share': round(w['dominant_share'], 3),
    'fare': round(w['fare'], 2), 'bench': round(w['bench_fare'], 2), 'prem': prem_by_pair.get((short(w['city1']), short(w['city2'])), round(w['fare_premium'], 4)),
    'revQ': int(w['est_dominant_rev_q']), 'riskQ': int(w['revenue_at_risk_q']),
} for w in wl])

# Entry events: short keys
ev = json.load(open(f'{SRC}/entry_events.json'))
dump('entry_events.json', [{
    'period': e['entry_period'], 'c1': short(e['city1']), 'c2': short(e['city2']), 'band': e['distance_band'],
    'entrant': e['low_cost_airline'], 'domBefore': e['dominant_before'], 'domAfter': e['dominant_after'],
    'sameLeader': e['n_dominant_airlines'] == 1,
    'preFare': round(e['pre_fare'], 1), 'postFare': round(e['post_fare'], 1),
    'prePax': round(e['pre_pax'], 1), 'postPax': round(e['post_pax'], 1),
    'preShare': round(e['pre_dominant_share'], 3), 'postShare': round(e['post_dominant_share'], 3),
} for e in ev])
