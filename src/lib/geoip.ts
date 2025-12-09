// Geo IP detection service
export interface GeoIPData {
  country_code: string;
  country_name: string;
  city: string;
  ip: string;
}

// List of GeoIP API providers to try (fallback chain)
const GEO_PROVIDERS = [
  {
    url: 'https://ipwho.is/',
    parse: (data: any) => data.country_code,
  },
  {
    url: 'https://api.country.is/',
    parse: (data: any) => data.country,
  },
  {
    url: 'https://ipapi.co/json/',
    parse: (data: any) => data.country_code,
  },
];

export async function getUserCountry(): Promise<string> {
  for (const provider of GEO_PROVIDERS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(provider.url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) continue;
      
      const data = await res.json();
      const countryCode = provider.parse(data);
      
      if (countryCode) {
        return countryCode;
      }
    } catch (error) {
      // Try next provider
      continue;
    }
  }
  
  console.warn('All GeoIP providers failed, using UNKNOWN');
  return 'UNKNOWN';
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
