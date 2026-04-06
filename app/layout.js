export const metadata = {
  title: 'Mop Til You Drop',
  description: 'Professional cleaning service — book online',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
