// Geo IP detection service
export interface GeoIPData {
  country_code: string;
  country_name: string;
  city: string;
  ip: string;
}

export async function getUserCountry(): Promise<string> {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      headers: { Accept: 'application/json' },
    });
    
    if (!res.ok) throw new Error('Failed to fetch geo data');
    
    const data: GeoIPData = await res.json();
    return data.country_code || 'UNKNOWN';
  } catch (error) {
    console.error('GeoIP detection failed:', error);
    return 'UNKNOWN';
  }
}

// Supported countries for targeting
export const SUPPORTED_COUNTRIES = [
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'GB', name: 'UK', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
] as const;

export type CountryCode = typeof SUPPORTED_COUNTRIES[number]['code'];
