import './styles.css';

export const metadata = {
  title: 'Research Wiki + GPT',
  description: 'Personal research wiki with an AI workspace'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
