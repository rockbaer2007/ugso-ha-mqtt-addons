# Festtags-Card-Editor 0.1.6

Home Assistant app, local scheduling integration and dashboard card. No cloud
or user-supplied credentials. Set up a region first, then a country: 47 countries
and a custom option. Choose western, Julian or both Christmas traditions.
Country presets suggest religious observances and customs, not a complete
statutory public-holiday calendar. Regional and family traditions can differ.

## Controls

First Christmas Day (December 25) and Second Christmas Day (December 26) are
named explicitly. Saint Stephen's Day, Sinterklaas, Pakjesavond, Three Kings
and Epiphany each have separate entries. Different names may share a date;
each can be selected and assigned a picture independently. Existing IDs,
schedules and picture mappings stay intact; new entries start without pictures.

Open the **Entity** field and type under **Search**. Results show an icon, name,
area/device (when available) and entity ID. Matching includes these names and
is case-insensitive. The current target is marked; × clears it. Escape closes
the popup and arrow keys move focus. Select a result and save. Searching alone
preserves the selected target; clearing the search shows all available targets.

Save errors appear in the top toolbar and retain the current draft. Do not
reload after a failed save; check the message first. Stale CSRF credentials
after an app restart are refreshed once after a new administrator check.

Configure up to five independent light, switch or input_boolean entities through
the integration options. Each gets its own on/off times and one of two modes:

- Daily within a date range, defaulting to first Advent Sunday through January
  10 inclusive. Override the range independently per entity if desired.
- Selected observances only, independent of the daily-mode date range.

Custom dates use `DD.MM.`. Advent and Thanksgiving are recalculated every year.
The year rollover requires no manual maintenance. February 29 is not supported
as a custom annual boundary. Equal on/off times and nonzero seconds are rejected.
An earlier off time means the next morning; the final eligible day's overnight
window is allowed to finish. HA's configured timezone applies. Nonexistent DST
times advance to the first valid minute; a repeated hour uses the first on and
last off instant to avoid oscillation.

The integration exposes current observance names (including simultaneous events),
next observance, its date, next switching time, season-active status and five
persistent enable/pause switches. Pause leaves the target untouched; enabling
reconciles it with the current schedule. Restart, configuration updates and
target recovery also reconcile the desired state. Ordinary minute ticks only
call services when the desired state changes. Unavailable targets are retried
after recovery. The integration's own control switches cannot be targets.

## Install

Install **Festtags-Card-Editor** from the shared **UGSo HA Apps** repository after
creating a full HA backup. Start the app. It installs only its own integration
and frontend files; updates back up existing own files into `/data/backups`.
Restart HA after the first installation or an update, then open the app UI.
On a fresh system, choose **Set up integration** once. Existing entries are not
changed; the initial safe configuration has no controlled entities. Then select
your preferred region and country in the editor.
The schedules continue inside HA Core even when the editor app is stopped.

The compact editor provides region/country selection, season rules and five
independent controls, only one expanded at a time. Save explicitly; unsaved
changes are indicated. Register/update only this card's resource using the
app's **Register card resource** button. Unrelated resources remain intact.

The editor is available only through Ingress to active HA administrators.
The actual user is checked; writes require a CSRF nonce. Supervisor credentials
stay on the server. There is no general-purpose HA API proxy.

### Own pictures

No pictures are bundled. Select a local `/local/` folder, upload your own PNG,
JPG, WebP or GIF files, then assign **region / country / observance / filename**.
Different countries may use different pictures for the same observance.
Enable pictures explicitly and save. Existing filenames are never overwritten;
duplicate uploads get a numeric suffix. Unassigning never deletes the image file.
Users must have the necessary rights to use their pictures.

Uploads are content-checked and limited to 5 MiB and 16 MP. GIF bytes are kept
unchanged. SVG files already placed in the directory can be assigned, but SVG
uploads are not accepted. Unrelated HA updates do not recreate image nodes.
Simultaneous observances can display separate images. Without a matching
observance picture, an assigned picture for the current Advent week may appear.
Missing pictures leave the text display intact.

### Optional manual installation without the app

Back up HA first. Copy `custom_components/weihnachtssteuerung` to
`/config/custom_components/weihnachtssteuerung` and the JS card from `www` to
`/config/www/weihnachtssteuerung/weihnachtssteuerung-card.js`. Restart HA. Add
**Weihnachtssteuerung** under Settings / Devices & services and use Configure
for the season and five channels. Empty entity slots remain unused.

Add a dashboard JavaScript module resource:
`/local/weihnachtssteuerung/weihnachtssteuerung-card.js?v=0.1.6`.

```yaml
type: custom:weihnachtssteuerung-card
title: Christmas control
```

The card auto-detects its observance sensor. Choose it explicitly in the visual
editor when multiple instances are installed. The compact card shows the
country, observances, season, entity states, individual schedules and next
switching times, with enable/pause buttons. UI and forms support German/English.

Other automations controlling the same target may conflict. HA cannot perform
switching while offline; startup applies the currently scheduled state. Review
selected observances after changing country/tradition.

## Local development

`python -m unittest discover -s tests -v` runs the pure calendar tests and isolated
runtime tests. `node --check www/weihnachtssteuerung-card.js` checks JavaScript
syntax. `python tools/build.py` generates complete form translations and the
installable ZIPs. The app is distributed through the shared UGSo HA Apps
repository. No user pictures, backups, credentials or test settings are bundled.
