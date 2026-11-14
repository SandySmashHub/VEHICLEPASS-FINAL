import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DEFAULT_CENTER } from '../utils/constants.js';
import { dotIcon } from '../utils/mapIcons.js';
import { fmtCoord, fmtDateTime } from '../utils/format.js';

function Fit({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 17 });
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(bounds.length ? [bounds[0], bounds[bounds.length - 1], bounds.length] : [])]);
  return null;
}

/** Draws a recorded route. Renders nothing for the route when there are no points (no invented data). */
export default function RouteMap({ points = [], entries = [] }) {
  const line = points.map((p) => [p.lat, p.lng]);
  const marks = [];
  entries.forEach((e) => {
    if (e.entryLocation?.lat !== undefined) marks.push({ key: `in-${e.entryTime}`, loc: e.entryLocation, color: '#2563eb', label: 'Entry', time: e.entryTime });
    if (e.exitLocation?.lat !== undefined) marks.push({ key: `out-${e.exitTime}`, loc: e.exitLocation, color: '#ea580c', label: 'Exit', time: e.exitTime });
  });
  const bounds = [...line, ...marks.map((m) => [m.loc.lat, m.loc.lng])];

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom className="h-full w-full" style={{ minHeight: 320 }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
      <Fit bounds={bounds} />
      {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#17633e', weight: 4, opacity: 0.85 }} />}
      {points.length <= 1500 && points.map((p, i) => (
        <CircleMarker key={i} center={[p.lat, p.lng]} radius={3} pathOptions={{ color: '#17633e', fillColor: '#fff', fillOpacity: 1, weight: 1.5 }}>
          <Tooltip>{fmtDateTime(p.recordedAt)}{p.accuracy ? ` · ±${Math.round(p.accuracy)} m` : ''}</Tooltip>
        </CircleMarker>
      ))}
      {points.length > 0 && (
        <>
          <Marker position={line[0]} icon={dotIcon('#16a34a')}><Popup><strong>Route start</strong><br />{fmtDateTime(points[0].recordedAt)}<br />{fmtCoord(points[0].lat)}, {fmtCoord(points[0].lng)}</Popup></Marker>
          <Marker position={line[line.length - 1]} icon={dotIcon('#dc2626')}><Popup><strong>Route end</strong><br />{fmtDateTime(points[points.length - 1].recordedAt)}<br />{fmtCoord(points[points.length - 1].lat)}, {fmtCoord(points[points.length - 1].lng)}</Popup></Marker>
        </>
      )}
      {marks.map((m) => (
        <Marker key={m.key} position={[m.loc.lat, m.loc.lng]} icon={dotIcon(m.color)}>
          <Popup><strong>Vehicle {m.label.toLowerCase()}</strong><br />{fmtDateTime(m.time)}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
