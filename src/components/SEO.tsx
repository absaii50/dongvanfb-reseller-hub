import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  keywords?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any>;
}

const BASE_URL = 'https://cryptomails.world';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'CryptoMails';

export function SEO({ 
  title = 'CryptoMails - Buy Premium Facebook Mail Accounts with Cryptocurrency',
  description = 'Buy premium Hotmail & Outlook mail accounts for Facebook verification. Instant delivery, cryptocurrency payments (Bitcoin, USDT, Ethereum), OAuth2 support, and 24/7 automated service.',
  canonical = '/',
  type = 'website',
  keywords = 'buy mail accounts, facebook mail, hotmail accounts, outlook accounts, crypto payment, bitcoin, cryptocurrency, email verification, oauth2 mail, bulk mail accounts',
  image = DEFAULT_IMAGE,
  noindex = false,
  jsonLd
}: SEOProps) {
  const fullUrl = `${BASE_URL}${canonical}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  // Default JSON-LD for the page
  const defaultJsonLd = {
    '@context': 'https://schema.org',
    '@type': type === 'product' ? 'Product' : 'WebPage',
    name: title,
    description,
    url: fullUrl,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL
    }
  };

  const structuredData = jsonLd || defaultJsonLd;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={SITE_NAME} />
      <link rel="canonical" href={fullUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}