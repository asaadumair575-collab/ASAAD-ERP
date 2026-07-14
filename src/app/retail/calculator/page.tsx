"use client";

import { useState, useMemo } from "react";

// City → Province mapping (based on courier service zones)
const CITIES: [string, string][] = [
  // Punjab
  ["LAHORE", "Punjab"],
  ["ISLAMABAD", "Punjab"],
  ["RAWALPINDI", "Punjab"],
  ["FAISALABAD", "Punjab"],
  ["MULTAN", "Punjab"],
  ["GUJRANWALA", "Punjab"],
  ["SIALKOT", "Punjab"],
  ["SARGODHA", "Punjab"],
  ["BAHAWALPUR", "Punjab"],
  ["SAHIWAL", "Punjab"],
  ["KASUR", "Punjab"],
  ["SHEIKHUPURA", "Punjab"],
  ["JHELUM", "Punjab"],
  ["GUJRAT", "Punjab"],
  ["MANDI BAHAUDDIN", "Punjab"],
  ["HAFIZABAD", "Punjab"],
  ["TOBA TEK SINGH", "Punjab"],
  ["VEHARI", "Punjab"],
  ["OKARA", "Punjab"],
  ["RAHIM YAR KHAN", "Punjab"],
  ["KHANEWAL", "Punjab"],
  ["LODHRAN", "Punjab"],
  ["MUZAFFARGARH", "Punjab"],
  ["LAYYAH", "Punjab"],
  ["BHAKKAR", "Punjab"],
  ["MIANWALI", "Punjab"],
  ["KHUSHAB", "Punjab"],
  ["CHINIOT", "Punjab"],
  ["CHAKWAL", "Punjab"],
  ["ATTOCK", "Punjab"],
  ["NOWSHERA VIRKAN", "Punjab"],
  ["KHURRIANWALA", "Punjab"],
  ["SAMANDARI", "Punjab"],
  ["JARANWALA", "Punjab"],
  ["KAMOKE", "Punjab"],
  ["MURIDKE", "Punjab"],
  ["WAZIRABAD", "Punjab"],
  ["KAMALIA", "Punjab"],
  ["JHANG", "Punjab"],
  ["PAKPATTAN", "Punjab"],
  ["BAHAWALNAGAR", "Punjab"],
  ["SADIQABAD", "Punjab"],
  ["LIAQAT PUR", "Punjab"],
  ["DERA GHAZI KHAN", "Punjab"],
  ["RAJANPUR", "Punjab"],
  ["RAIWIND", "Punjab"],
  ["PATOKI", "Punjab"],
  ["PHOOL NAGAR", "Punjab"],
  ["LALA MUSA", "Punjab"],
  ["GOJRA", "Punjab"],
  ["GUJAR KHAN", "Punjab"],
  ["BHAI PHERU", "Punjab"],
  ["FORT ABBAS", "Punjab"],
  ["MIAN CHANNU", "Punjab"],
  ["SHAKARGARH", "Punjab"],
  ["PIND DADAN KHAN", "Punjab"],
  ["NAROWAL", "Punjab"],
  ["MURREE", "Punjab"],
  ["BUREWALA", "Punjab"],
  ["CHICHAWATNI", "Punjab"],
  ["KHARIAN", "Punjab"],
  ["HAROONABAD", "Punjab"],
  ["DEPALPUR", "Punjab"],
  ["WAH CANTT", "Punjab"],
  ["HASSAN ABDAL", "Punjab"],
  ["KOT ADDU", "Punjab"],
  ["NANKANA SAHIB", "Punjab"],
  ["DEHARKI", "Punjab"],
  ["GHOTKI", "Punjab"],
  ["KHANPUR", "Punjab"],
  ["DERA GHAZI KHAN", "Punjab"],
  ["DINGA", "Punjab"],
  ["PHALIA", "Punjab"],
  ["DASKA", "Punjab"],
  ["PASROOR", "Punjab"],
  ["CHUNIAN", "Punjab"],
  ["SUMBRIAL", "Punjab"],
  ["KALLAR SYEDDAN", "Punjab"],
  ["JALALPUR JATTAN", "Punjab"],
  ["KAHAUTA", "Punjab"],
  ["FATEH JANG", "Punjab"],
  ["PINDI GHEB", "Punjab"],
  ["ARIFWALA", "Punjab"],
  ["SHORKOT", "Punjab"],
  ["ALIPUR CHATHA", "Punjab"],
  ["BHALWAAL", "Punjab"],
  ["HASIL PUR", "Punjab"],
  ["AHMEDPUR EAST", "Punjab"],
  ["PEER MAHAL", "Punjab"],
  ["SHAHKOT", "Punjab"],
  ["SHAHDARA TOWN", "Punjab"],
  ["KOT ADDU", "Punjab"],
  ["ALIPUR", "Punjab"],
  ["MAILSI", "Punjab"],
  ["SHUJABAD", "Punjab"],
  ["JAHANIAN", "Punjab"],
  ["PAKPATTAN", "Punjab"],
  ["HASILPUR", "Punjab"],
  ["PATTOKI", "Punjab"],
  ["KAMOKE", "Punjab"],
  ["GUJRANWALA", "Punjab"],
  ["KHANEWAL", "Punjab"],
  ["MANAWALA", "Punjab"],
  ["PANOAQIL", "Punjab"],
  ["SADIQABAD", "Punjab"],
  ["RAHIM YAR KHAN", "Punjab"],
  ["LIAQUATABAD", "Punjab"],
  // Sindh
  ["KARACHI", "Sindh"],
  ["HYDERABAD", "Sindh"],
  ["SUKKUR", "Sindh"],
  ["LARKANA", "Sindh"],
  ["NAWABSHAH", "Sindh"],
  ["MIRPUR KHAS", "Sindh"],
  ["THATTA", "Sindh"],
  ["BADIN", "Sindh"],
  ["RANI PUR", "Sindh"],
  ["MORO", "Sindh"],
  ["KHAIRPUR", "Sindh"],
  ["HALA", "Sindh"],
  ["JACOBABAD", "Sindh"],
  ["SHIKARPUR", "Sindh"],
  ["DADU", "Sindh"],
  ["SANGHAR", "Sindh"],
  ["TANDO ALLAHYAR", "Sindh"],
  ["TANDO ADAM", "Sindh"],
  ["TANDO MOHD KHAN", "Sindh"],
  ["MIRPUR SAKRO", "Sindh"],
  // KPK
  ["PESHAWAR", "KPK"],
  ["ABBOTTABAD", "KPK"],
  ["HARIPUR", "KPK"],
  ["DERA ISMAIL KHAN", "KPK"],
  ["KOHAT", "KPK"],
  ["BANNU", "KPK"],
  ["MANSEHRA", "KPK"],
  ["SWAT", "KPK"],
  ["CHITRAL", "KPK"],
  ["KARAK", "KPK"],
  ["TANK", "KPK"],
  ["MARDAN", "KPK"],
  ["NOWSHERA", "KPK"],
  ["SWABI", "KPK"],
  ["CHARSADDA", "KPK"],
  ["BUNER", "KPK"],
  ["BATKHELA", "KPK"],
  // Balochistan
  ["QUETTA", "Balochistan"],
  ["GWADAR", "Balochistan"],
  ["TURBAT", "Balochistan"],
  ["KHUZDAR", "Balochistan"],
  ["HUB", "Balochistan"],
  ["DALBANDIN", "Balochistan"],
  ["CHAMAN", "Balochistan"],
  // AJK
  ["MIRPUR (AJK)", "AJK"],
  ["MUZAFFARABAD (AJK)", "AJK"],
  ["RAWALAKOT (AJK)", "AJK"],
  ["BAGH (AJK)", "AJK"],
  ["KOTLI (AJK)", "AJK"],
  ["BHIMBER (AJK)", "AJK"],
  // GB
  ["GILGIT", "GB"],
  ["SKARDU", "GB"],
  ["HUNZA", "GB"],
];

const ORIGIN = { city: "KARACHI", province: "Sindh" };

type Zone = "within" | "same" | "other";

function getZone(city: string, province: string): Zone {
  if (city.toUpperCase() === ORIGIN.city) return "within";
  if (province === ORIGIN.province) return "same";
  return "other";
}

function calcRate(dozens: number, zone: Zone, service: "standard" | "overland") {
  const weightKg = dozens * 0.75;
  let base = 0;
  let fuelPct = 0;

  if (service === "standard") {
    // Base rates per weight slab; each additional 0.5 kg after 1 kg
    const r =
      zone === "within" ? { r1: 120, r2: 130, add: 65 } :
      zone === "same"   ? { r1: 140, r2: 160, add: 80 } :
                          { r1: 150, r2: 170, add: 85 };
    if (weightKg <= 0.5) base = r.r1;
    else if (weightKg <= 1.0) base = r.r2;
    else base = r.r2 + Math.ceil((weightKg - 1) / 0.5) * r.add;
    fuelPct = 0.15;
  } else {
    // Overland: flat up to 5 kg, then per 1 kg
    const r =
      zone === "within" ? { r1: 300, add: 100 } :
      zone === "same"   ? { r1: 360, add: 120 } :
                          { r1: 390, add: 130 };
    if (weightKg <= 5) base = r.r1;
    else base = r.r1 + Math.ceil(weightKg - 5) * r.add;
    fuelPct = 0.25;
  }

  const fuel = Math.round(base * fuelPct);
  const subtotal = base + fuel;
  const tax = Math.round(subtotal * 0.15);
  const total = subtotal + tax;
  return { weightKg, base, fuel, fuelPct, subtotal, tax, total };
}

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function RateCalculatorPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<[string, string] | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dozens, setDozens] = useState(1);
  const [service, setService] = useState<"standard" | "overland">("standard");
  const [manualZone, setManualZone] = useState<"auto" | Zone>("auto");

  const uniqueCities = useMemo(() => {
    const seen = new Set<string>();
    return CITIES.filter(([name]) => {
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? uniqueCities.filter(([name]) => name.toLowerCase().includes(q)).slice(0, 20) : [];
  }, [search, uniqueCities]);

  const autoZone: Zone = selected ? getZone(selected[0], selected[1]) : "other";
  const zone: Zone = manualZone === "auto" ? autoZone : manualZone;
  const result = selected ? calcRate(dozens, zone, service) : null;

  const zoneLabel = zone === "within" ? "Within City" : zone === "same" ? "Same Province" : "Province to Province";
  const zoneBadge =
    zone === "within" ? "bg-blue-100 text-blue-700" :
    zone === "same" ? "bg-green-100 text-green-700" :
    "bg-orange-100 text-orange-700";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rate Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Estimate courier charges for ball deliveries — COD &amp; Non-COD. Origin: <strong>Karachi (Sindh)</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* ── Inputs ──────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">

          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Destination City
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type to search city…"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) setSelected(null); }}
                onFocus={() => setShowDropdown(true)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              {showDropdown && filtered.length > 0 && (
                <div className="absolute z-10 w-full mt-1 border border-gray-200 rounded-xl bg-white shadow-lg max-h-52 overflow-y-auto">
                  {filtered.map(([name, prov]) => (
                    <button
                      key={name}
                      onMouseDown={() => {
                        setSelected([name, prov]);
                        setSearch(name);
                        setShowDropdown(false);
                        setManualZone("auto");
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                    >
                      <span className="font-medium">{name}</span>
                      <span className="text-xs text-gray-400">{prov}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">{selected[0]} ({selected[1]})</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${zoneBadge}`}>{zoneLabel}</span>
              </div>
            )}
          </div>

          {/* Zone override */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Zone Override
            </label>
            <select
              value={manualZone}
              onChange={e => setManualZone(e.target.value as "auto" | Zone)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
            >
              <option value="auto">Auto-detect from city</option>
              <option value="within">Within City (Karachi)</option>
              <option value="same">Same Province — Other City</option>
              <option value="other">Province to Province</option>
            </select>
          </div>

          {/* Dozens */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Quantity (Dozens)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDozens(d => Math.max(1, d - 1))}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >−</button>
              <input
                type="number"
                min="1"
                value={dozens}
                onChange={e => setDozens(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={() => setDozens(d => d + 1)}
                className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-medium"
              >+</button>
              <span className="text-sm text-gray-400">=&nbsp;<strong className="text-gray-700">{(dozens * 0.75).toFixed(2)} kg</strong></span>
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Service Type
            </label>
            <div className="flex gap-2">
              {(["standard", "overland"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setService(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    service === s
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {s === "standard" ? "Standard" : "Overland"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Result ──────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Estimated Cost</p>
          {!result ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-sm text-gray-400 gap-2">
              <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
              </svg>
              Select a destination city to calculate the rate.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-black rounded-xl p-5 text-white">
                <p className="text-xs text-gray-400 mb-1">Total Payable (incl. fuel &amp; tax)</p>
                <p className="text-4xl font-bold tracking-tight">Rs {fmt(result.total)}</p>
                <p className="text-xs text-gray-400 mt-1">{dozens} doz · {result.weightKg.toFixed(2)} kg · {zoneLabel}</p>
              </div>

              <div className="space-y-0 divide-y divide-gray-50 text-sm">
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Base Rate</span>
                  <span className="font-medium">Rs {fmt(result.base)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Fuel Surcharge ({Math.round(result.fuelPct * 100)}%)</span>
                  <span className="font-medium">Rs {fmt(result.fuel)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">Rs {fmt(result.subtotal)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Tax (15%)</span>
                  <span className="font-medium">Rs {fmt(result.tax)}</span>
                </div>
                <div className="flex justify-between py-2.5 font-semibold">
                  <span>Grand Total</span>
                  <span>Rs {fmt(result.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Rate Reference Table ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Rate Reference (before fuel &amp; tax)</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Standard */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Standard (COD &amp; Non-COD)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-1.5 pr-3">Weight</th>
                    <th className="pb-1.5 pr-3">Within City</th>
                    <th className="pb-1.5 pr-3">Same Province</th>
                    <th className="pb-1.5">Prov–Prov</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-1.5 pr-3 text-gray-500">≤ 0.5 kg</td>
                    <td className="py-1.5 pr-3">Rs 120</td>
                    <td className="py-1.5 pr-3">Rs 140</td>
                    <td className="py-1.5">Rs 150</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 text-gray-500">≤ 1.0 kg</td>
                    <td className="py-1.5 pr-3">Rs 130</td>
                    <td className="py-1.5 pr-3">Rs 160</td>
                    <td className="py-1.5">Rs 170</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 text-gray-500">+0.5 kg each</td>
                    <td className="py-1.5 pr-3">+ Rs 65</td>
                    <td className="py-1.5 pr-3">+ Rs 80</td>
                    <td className="py-1.5">+ Rs 85</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Overland */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Overland (COD &amp; Non-COD)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-1.5 pr-3">Weight</th>
                    <th className="pb-1.5 pr-3">Within City</th>
                    <th className="pb-1.5 pr-3">Same Province</th>
                    <th className="pb-1.5">Prov–Prov</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="py-1.5 pr-3 text-gray-500">≤ 5 kg</td>
                    <td className="py-1.5 pr-3">Rs 300</td>
                    <td className="py-1.5 pr-3">Rs 360</td>
                    <td className="py-1.5">Rs 390</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 text-gray-500">+1 kg each</td>
                    <td className="py-1.5 pr-3">+ Rs 100</td>
                    <td className="py-1.5 pr-3">+ Rs 120</td>
                    <td className="py-1.5">+ Rs 130</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Fuel surcharge 15% (standard) / 25% (overland) + Tax 15% applied on top of base rates. · 1 dozen balls = 0.75 kg. · Standard: +0.5 kg slabs after 1 kg.
        </p>
      </div>
    </div>
  );
}
