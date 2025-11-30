import AboutUs from './AboutUs';

interface AboutPageProps {
  onNavigate?: (path: string) => void;
}

const AboutPage = ({ onNavigate }: AboutPageProps) => {
  return (
    <main className="page-empty" aria-label="About page">
      <AboutUs onNavigate={onNavigate} />
    </main>
  );
};

export default AboutPage;
