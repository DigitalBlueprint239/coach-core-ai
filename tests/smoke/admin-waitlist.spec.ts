/// <reference types="cypress" />

const {
  CYPRESS_ADMIN_EMAIL,
  CYPRESS_ADMIN_PASSWORD,
  CYPRESS_FIREBASE_API_KEY = 'AIzaSyB2iWL0UkuLJYpr-II9IpwGWDOMnLcfq_c',
  CYPRESS_FIREBASE_PROJECT_ID = 'coach-core-ai',
} = Cypress.env();

const buildFirebaseAuthKey = (apiKey: string) => `firebase:authUser:${apiKey}:[DEFAULT]`;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      seedWaitlistEntry(email: string): Chainable<void>;
      loginAsAdmin(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAsAdmin', () => {
  if (!CYPRESS_ADMIN_EMAIL || !CYPRESS_ADMIN_PASSWORD) {
    throw new Error('Set CYPRESS_ADMIN_EMAIL and CYPRESS_ADMIN_PASSWORD env vars before running the smoke test.');
  }

  cy.request({
    method: 'POST',
    url: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CYPRESS_FIREBASE_API_KEY}`,
    body: {
      email: CYPRESS_ADMIN_EMAIL,
      password: CYPRESS_ADMIN_PASSWORD,
      returnSecureToken: true,
    },
  }).then(({ body }) => {
    const { idToken, refreshToken, localId, expiresIn } = body;
    const expirationTime = Date.now() + Number(expiresIn) * 1000;

    const authState = {
      uid: localId,
      email: CYPRESS_ADMIN_EMAIL,
      stsTokenManager: {
        accessToken: idToken,
        refreshToken,
        expirationTime,
      },
      providerData: [
        {
          providerId: 'password',
          email: CYPRESS_ADMIN_EMAIL,
        },
      ],
    };

    cy.window().then((win) => {
      win.localStorage.setItem(buildFirebaseAuthKey(CYPRESS_FIREBASE_API_KEY), JSON.stringify(authState));
    });
  });
});

Cypress.Commands.add('seedWaitlistEntry', (email: string) => {
  const payload = {
    fields: {
      email: { stringValue: email },
      source: { stringValue: 'smoke-test' },
      status: { stringValue: 'pending' },
      createdAt: { timestampValue: new Date().toISOString() },
    },
  };

  const url = `https://firestore.googleapis.com/v1/projects/${CYPRESS_FIREBASE_PROJECT_ID}/databases/(default)/documents/waitlist`;
  cy.request('POST', url, payload);
});

const waitForTable = () => {
  cy.get('[data-testid="waitlist-table"]', { timeout: 15000 }).should('be.visible');
  cy.get('[data-testid="waitlist-table"] tbody tr').should('have.length.greaterThan', 0);
};

describe('Admin Waitlist Smoke Test', () => {
  const uniqueEmail = `smoke-${Date.now()}@example.com`;

  it('renders dashboard, exports CSV, and shows new entries in real-time', () => {
    cy.loginAsAdmin();

    cy.on('window:before:load', (win) => {
      cy.stub(win.console, 'error').as('consoleError');
    });

    cy.visit('https://coach-core-ai.web.app/admin/waitlist');

    waitForTable();

    cy.get('[data-testid="waitlist-total"]').should('exist');
    cy.get('[data-testid="export-waitlist-csv"]').should('exist');

    cy.get('[data-testid="export-waitlist-csv"]').then(($button) => {
      const downloadAttr = $button.attr('download');
      expect(downloadAttr).to.match(/coach-core-waitlist/);
    });

    cy.seedWaitlistEntry(uniqueEmail);

    cy.contains('td', uniqueEmail, { timeout: 15000 }).should('exist');

    cy.get('@consoleError').should('not.have.been.called');
  });
});
