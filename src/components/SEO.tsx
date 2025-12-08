import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  type?: string;
}

export function SEO({ 
  title = 'CryptoMails - Buy Premium Facebook Mail Accounts with Cryptocurrency',
  description = 'Buy premium Hotmail & Outlook mail accounts for Facebook verification. Instant delivery, cryptocurrency payments, OAuth2 support, and 24/7 automated service.',
  canonical,
  type = 'website'
}: SEOProps) {
  const baseUrl = 'https://cryptomails.world';
  const fullUrl = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:url" content={fullUrl} />
    </Helmet>
  );
}