/**
 * Location Service
 * Detects user location using HTML5 Geolocation API
 * Reverse geocodes using OpenStreetMap Nominatim API
 * Matches district (English/Telugu) for Telangana
 */

const TELANGANA_DISTRICTS = [
    { en: "Adilabad", te: "ఆదిలాబాద్" },
    { en: "Bhadradri Kothagudem", te: "భద్రాద్రి కొత్తగూడెం" },
    { en: "Hanamkonda", te: "హనుమకొండ" },
    { en: "Hyderabad", te: "హైదరాబాద్" },
    { en: "Jagitial", te: "జగిత్యాల్" },
    { en: "Jangaon", te: "జనగామ" },
    { en: "Jayashankar Bhupalpally", te: "జయశంకర్ భూపాలపల్లి" },
    { en: "Jogulamba Gadwal", te: "జోగులాంబ గద్వాల్" },
    { en: "Kamareddy", te: "కామారెడ్డి" },
    { en: "Karimnagar", te: "కరీంనగర్" },
    { en: "Khammam", te: "ఖమ్మం" },
    { en: "Komaram Bheem Asifabad", te: "కొమరంభీం ఆసిఫాబాద్" },
    { en: "Mahabubabad", te: "మహబూబాబాద్" },
    { en: "Mahabubnagar", te: "మహబూబ్‌నగర్" },
    { en: "Mancherial", te: "మంచిర్యాల్" },
    { en: "Medak", te: "మెదక్" },
    { en: "Medchal–Malkajgiri", te: "మెద్చల్–మల్కాజిగిరి" },
    { en: "Mulugu", te: "ములుగు" },
    { en: "Nagarkurnool", te: "నాగర్ కర్నూల్" },
    { en: "Nalgonda", te: "నల్గొండ" },
    { en: "Narayanpet", te: "నారాయణపేట" },
    { en: "Nirmal", te: "నిర్మల్" },
    { en: "Nizamabad", te: "నిజామాబాద్" },
    { en: "Peddapalli", te: "పెద్దపల్లి" },
    { en: "Rajanna Sircilla", te: "రాజన్న సిరిసిల్ల" },
    { en: "Ranga Reddy", te: "రంగారెడ్డి" },
    { en: "Sangareddy", te: "సంగారెడ్డి" },
    { en: "Siddipet", te: "సిద్దిపేట" },
    { en: "Suryapet", te: "సూర్యాపేట" },
    { en: "Vikarabad", te: "వికారాబాద్" },
    { en: "Wanaparthy", te: "వనపర్తి" },
    { en: "Warangal", te: "వరంగల్" },
    { en: "Yadadri Bhuvanagiri", te: "యాదాద్రి భువనగిరి" },
  ];
  
  // 🧩 Normalize names (English or Telugu)
  export function normalizeDistrictName(name) {
    if (!name) return "";
    return String(name)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_\u0C00-\u0C7F]/g, ""); // Telugu unicode range allowed
  }
  
  // 📍 Get current user position
  export async function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }
  
  // 🌍 Reverse geocode from OpenStreetMap
  export async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MGNREGA-Dashboard/1.0" },
    });
    if (!res.ok) throw new Error("Reverse geocode failed");
    const data = await res.json();
    return data;
  }
  
  // 🧭 Extract district/state
  export function extractLocationInfo(data) {
    if (!data?.address) return null;
  
    const addr = data.address;
    const district =
      addr.state_district ||
      addr.county ||
      addr.city ||
      addr.town ||
      addr.village ||
      null;
  
    const state = addr.state || null;
  
    return { district, state };
  }
  
  // 🧠 Match English/Telugu district
  function matchTelanganaDistrict(detectedDistrict) {
    if (!detectedDistrict) return null;
  
    const normalized = normalizeDistrictName(detectedDistrict);
  
    for (const d of TELANGANA_DISTRICTS) {
      const nEn = normalizeDistrictName(d.en);
      const nTe = normalizeDistrictName(d.te);
  
      if (normalized === nEn || normalized === nTe || nTe.includes(normalized)) {
        return d.en;
      }
    }
  
    return null;
  }
  
  // 🚀 Main detect function
  export async function detectUserLocation() {
    try {
      const pos = await getCurrentPosition();
      const geo = await reverseGeocode(pos.latitude, pos.longitude);
      const info = extractLocationInfo(geo);
  
      if (!info) throw new Error("Failed to extract location info");
  
      const matchedDistrict =
        info.state === "Telangana" ? matchTelanganaDistrict(info.district) : null;
  
      const finalLocation = {
        district: matchedDistrict,
        state: info.state,
        address: geo.display_name,
        coords: { lat: pos.latitude, lon: pos.longitude },
      };
  
      return finalLocation;
    } catch (err) {
      return { district: null, state: null, error: err.message };
    }
  }
  