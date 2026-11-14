import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DEFAULT_CENTER } from '../utils/constants.js';
import { vehicleIcon, isStale } from '../utils/mapIcons.js';
import { fmtCoord, fmtKm, timeAgo } from '../utils/format.js';
import { Badge, SimBadge } from './ui.jsx';

function Controller({ vehicles, selected, geofences, userPos }) {
  const map = useMap();
  const fitted = useRef('');
  const signature = vehicles.map((v) => v._id).sort().join(',') + `|${geofences.length}`;

  useEffect(() => {
    if (!selected?.location) return;
    map.flyTo([selected.location.lat, selected.location.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  useEffect(() => {
    if (fitted.current === signature) return;
    const pts = vehicles.filter((v) => v.location).map((v) => [v.location.lat, v.location.lng]);
    geofences.forEach((g) => g.polygon.forEach((p) => pts.push([p.lat, p.lng])));
    if (!pts.length && userPos) pts.push([userPos.lat, userPos.lng]);
    if (!pts.length) return;
    fitted.current = signature;
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, !!userPos]);

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function VehiclePopup({ v }) {
  return (
    <div className="min-w-[200px] space-y-1.5 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-base">{v.regNumber}</strong>
        <Badge value={v.status} />
      </div>
      <div className="text-slate-600">{v.type}{v.model ? ` · ${v.model}` : ''}</div>
      <div>{v.driverName} · {v.driverContact}</div>
      {v.overstay && <div className="font-semibold text-red-700">Overstaying</div>}
      {v.distanceKm !== undefined && <div>Distance: <strong>{fmtKm(v.distanceKm)}</strong></div>}
      {v.location && (
        <div className="text-xs text-slate-500">
          {fmtCoord(v.location.lat)}, {fmtCoord(v.location.lng)}
          {v.location.accuracy ? ` · ±${Math.round(v.location.accuracy)} m` : ''}
          <br />Updated {timeAgo(v.location.updatedAt)}{isStale(v) ? ' (delayed)' : ''}
        </div>
      )}
      {(v.location?.isSimulated || v.isDemo) && <SimBadge />}
    </div>
  );
}

/**
 * Leaflet + OpenStreetMap map showing vehicles, geofences, the user's own position and an optional search radius.
 * Vehicles need { _id, regNumber, status, location:{lat,lng} }.
 */
export default function VehicleMap({ vehicles = [], selectedId, onSelect, userPos, geofences = [], radiusKm, children }) {
  const shown = useMemo(() => vehicles.filter((v) => v.location?.lat !== undefined), [vehicles]);
  const selected = shown.find((v) => v._id === selectedId);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom className="h-full w-full" style={{ minHeight: 280 }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <Controller vehicles={shown} selected={selected} geofences={geofences} userPos={userPos} />

        {geofences.filter((g) => g.active !== false).map((g) => (
          <Polygon key={g._id} positions={g.polygon.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#15803d', weight: 2, dashArray: '6 4', fillOpacity: 0.06 }}>
            <Tooltip sticky>{g.name}</Tooltip>
          </Polygon>
        ))}

        {userPos && (
          <>
            {userPos.accuracy ? <Circle center={[userPos.lat, userPos.lng]} radius={userPos.accuracy} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.1 }} /> : null}
            <CircleMarker center={[userPos.lat, userPos.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}>
              <Tooltip>Your location</Tooltip>
            </CircleMarker>
            {radiusKm ? <Circle center={[userPos.lat, userPos.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#2563eb', weight: 1.5, dashArray: '4 4', fillOpacity: 0.04 }} /> : null}
          </>
        )}

        {shown.map((v) => (
          <Marker key={v._id} position={[v.location.lat, v.location.lng]} icon={vehicleIcon(v, v._id === selectedId)} eventHandlers={{ click: () => onSelect?.(v._id) }}>
            <Popup><VehiclePopup v={v} /></Popup>
          </Marker>
        ))}
        {children}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow">
        {[['#16a34a', 'Inside'], ['#64748b', 'Outside'], ['#dc2626', 'Overstay']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
        ))}
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />You</span>
      </div>
    </div>
  );
}
