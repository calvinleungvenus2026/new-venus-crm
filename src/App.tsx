import { useEffect, useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

export interface Company {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export interface AuthSession {
  email: string;
  name: string;
  role: 'COMPANY_ADMIN' | 'SUPER_ADMIN';
  company: Company;
  companies: Company[];
}

interface Account {
  email: string;
  password: string;
  name: string;
  role: AuthSession['role'];
  companyIds: string[];
}

const AUTH_STORAGE_KEY = 'venus-crm-session';

const companies: Company[] = [
  { id: 'venus', name: 'Venus London Technology Limited', shortName: 'VL', color: '#4e8ef7' },
  { id: 'trinity-property', name: 'Trinity Property Consultancy Limited', shortName: 'TP', color: '#14b8a6' },
  { id: 'trinity-concierge', name: 'Trinity London Concierge Limited', shortName: 'TC', color: '#f97316' },
  { id: 'ripplesoft', name: 'Ripplesoft Limited', shortName: 'RS', color: '#8b5cf6' },
  { id: 'ripple-mic', name: 'Ripple MIC Limited', shortName: 'RM', color: '#ef4444' },
  { id: 'luminarytech', name: 'Luminarytech Limited', shortName: 'LT', color: '#0ea5e9' },
  { id: 'banyan-digital', name: 'Banyan Digital Limited', shortName: 'BD', color: '#22c55e' },
  { id: 'momentum-growth', name: 'Momentum Growth Agency Limited', shortName: 'MG', color: '#f59e0b' },
  { id: 'biocheck', name: 'Biocheck Health Limited', shortName: 'BH', color: '#10b981' },
  { id: 'crestpoint-hr', name: 'CrestpointHR', shortName: 'CH', color: '#6366f1' },
  { id: 'novasoft-tech', name: 'NovaSoftTech', shortName: 'NS', color: '#06b6d4' }
];

const DEFAULT_PASSWORD = 'testtest123';

const accounts: Account[] = [
  {
    email: 'admin-crm@venuslondontechnology.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Venus London Technology Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['venus']
  },
  {
    email: 'admin-crm@trinitypropertyconsultancy.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Trinity Property Consultancy Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['trinity-property']
  },
  {
    email: 'admin-crm@trinitylondonconcierge.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Trinity London Concierge Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['trinity-concierge']
  },
  {
    email: 'admin-crm@ripplesoftlimited.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Ripplesoft Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['ripplesoft']
  },
  {
    email: 'admin-crm@ripplemiclimited.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Ripple MIC Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['ripple-mic']
  },
  {
    email: 'admin-crm@luminarytech.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Luminarytech Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['luminarytech']
  },
  {
    email: 'admin-crm@banyandigitallimited.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Banyan Digital Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['banyan-digital']
  },
  {
    email: 'admin-crm@momentumgrowthagency.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Momentum Growth Agency Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['momentum-growth']
  },
  {
    email: 'admin-crm@biocheckhealth.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'Biocheck Health Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['biocheck']
  },
  {
    email: 'admin-crm@crestpointhr.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'CrestpointHR Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['crestpoint-hr']
  },
  {
    email: 'admin-crm@novasoft-technologies.co.uk',
    password: DEFAULT_PASSWORD,
    name: 'NovaSoftTech Admin',
    role: 'COMPANY_ADMIN',
    companyIds: ['novasoft-tech']
  },
  {
    email: 'admin-crm@universal.com',
    password: DEFAULT_PASSWORD,
    name: 'Universal CRM Admin',
    role: 'SUPER_ADMIN',
    companyIds: companies.map((company) => company.id)
  }
];

function buildSession(account: Account): AuthSession {
  const accessibleCompanies = companies.filter((company) => account.companyIds.includes(company.id));
  const defaultCompany = accessibleCompanies[0] ?? companies[0];

  return {
    email: account.email,
    name: account.name,
    role: account.role,
    company: defaultCompany,
    companies: accessibleCompanies
  };
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedSession) {
      return;
    }

    try {
      const parsedSession = JSON.parse(storedSession) as AuthSession;
      setSession(parsedSession);
    } catch (error) {
      console.error('无法恢复登录状态:', error);
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const handleLogin = (email: string, password: string) => {
    const matchedAccount = accounts.find(
      (account) => account.email.toLowerCase() === email.toLowerCase() && account.password === password
    );

    if (!matchedAccount) {
      return false;
    }

    const nextSession = buildSession(matchedAccount);

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    return true;
  };

  const handleSwitchCompany = (companyId: string) => {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      const nextCompany =
        currentSession.companies.find((company) => company.id === companyId) || currentSession.company;

      const nextSession = {
        ...currentSession,
        company: nextCompany
      };

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      return nextSession;
    });
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  };

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DashboardPage
      session={session}
      onLogout={handleLogout}
      onSwitchCompany={handleSwitchCompany}
    />
  );
}

export default App;
