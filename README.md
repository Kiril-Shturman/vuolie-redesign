# Вуолье — unofficial redesign concept

**This is an unofficial design concept, not the official sales website of the Вуолье settlement and not a public offer.**
Official site: https://vuolie.ru/

A static, dependency-free landing page with an interactive selector built on the public masterplan
(233 plots): filters by area, price range and status, map/list views, a shortlist and a
"request" draft.

## Important limitations

- **Prices and statuses are a dated snapshot (17.10.2026)** copied from the public masterplan on vuolie.ru.
  They are not live, may be out of date and are not guaranteed. Always confirm with the seller.
  Plot 78 shows a source price of 210 000 ₽ that looks like a typo; it is flagged and excluded from the advertised minimum.
- **No lead submission.** The "Запросить" action only builds a local text draft (copy / download / share).
  Nothing is sent, nothing is booked, no personal data is collected, and there are no forms.
- Analytics hooks only dispatch local DOM events; nothing is connected to a network or third party.
- Not asserted: distances, utilities, land category/legal status, payment terms.

## Third-party content and rights

The photographs (`assets/hero.jpeg`, `lake.jpeg`, `forest.jpeg`, `shore.jpeg`), the masterplan image
(`assets/masterplan.webp`) and the plot geometry/prices (`assets/plots.json`, data embedded in `app.js`)
come from the publicly available vuolie.ru website (see [SOURCES.md](SOURCES.md)).
**All rights to them remain with their original rightsholders.** They are included only to demonstrate
the concept. No license is granted for them by this repository. Rightsholders who want them removed can open an issue.

No open-source license is applied to this repository.

## Run locally

Requires Node.js 18+.

```
node server.cjs        # http://127.0.0.1:4173 (loopback only, serves just the site files)
node test.cjs          # static + HTTP checks
```

You can also open `index.html` directly or host the files on any static host.
