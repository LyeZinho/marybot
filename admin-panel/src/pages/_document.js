import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Admin Panel do MaryBot - Gerenciamento e monitoramento do bot Discord" />
        <meta name="keywords" content="discord bot, admin panel, dashboard, anime, gaming" />
        <meta name="author" content="LyeZinho" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}