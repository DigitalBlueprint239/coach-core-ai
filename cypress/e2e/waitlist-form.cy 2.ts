describe('Waitlist Form Tests', () => {
  beforeEach(() => {
    // Visit the waitlist page
    cy.visit('/waitlist');
  });

  it('should display the waitlist form', () => {
    // Check that the waitlist form is visible
    cy.get('form').should('be.visible');
    
    // Check for email input
    cy.get('input[type="email"]').should('be.visible');
    
    // Check for submit button
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should accept a valid email and store in Firestore', () => {
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Intercept Firestore requests
    cy.intercept('POST', '**/firestore/v1/projects/coach-core-ai/databases/(default)/documents/waitlist**', {
      statusCode: 200,
      body: { name: 'test-doc-id' }
    }).as('waitlistSubmission');

    // Fill in the email
    cy.get('input[type="email"]').type(testEmail);
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the submission to complete
    cy.wait('@waitlistSubmission', { timeout: 10000 });
    
    // Check for success message
    cy.contains(/success|thank you|subscribed/i).should('be.visible');
  });

  it('should validate email format', () => {
    // Test invalid email formats
    const invalidEmails = [
      'invalid-email',
      'test@',
      '@example.com',
      'test..test@example.com'
    ];

    invalidEmails.forEach((email) => {
      cy.get('input[type="email"]').clear().type(email);
      cy.get('button[type="submit"]').click();
      
      // Should show validation error
      cy.contains(/invalid|error|please enter a valid/i).should('be.visible');
    });
  });

  it('should handle duplicate email submission', () => {
    const testEmail = 'duplicate@example.com';
    
    // First submission
    cy.intercept('POST', '**/firestore/v1/projects/coach-core-ai/databases/(default)/documents/waitlist**', {
      statusCode: 200,
      body: { name: 'test-doc-id' }
    }).as('firstSubmission');

    cy.get('input[type="email"]').type(testEmail);
    cy.get('button[type="submit"]').click();
    cy.wait('@firstSubmission');
    cy.contains(/success|thank you/i).should('be.visible');

    // Second submission (duplicate)
    cy.intercept('POST', '**/firestore/v1/projects/coach-core-ai/databases/(default)/documents/waitlist**', {
      statusCode: 400,
      body: { error: { message: 'Email already exists' } }
    }).as('duplicateSubmission');

    cy.get('input[type="email"]').clear().type(testEmail);
    cy.get('button[type="submit"]').click();
    cy.wait('@duplicateSubmission');
    
    // Should show duplicate error
    cy.contains(/already|duplicate|exists/i).should('be.visible');
  });

  it('should handle network errors gracefully', () => {
    const testEmail = 'test@example.com';
    
    // Simulate network error
    cy.intercept('POST', '**/firestore/v1/projects/coach-core-ai/databases/(default)/documents/waitlist**', {
      statusCode: 500,
      body: { error: { message: 'Internal server error' } }
    }).as('networkError');

    cy.get('input[type="email"]').type(testEmail);
    cy.get('button[type="submit"]').click();
    cy.wait('@networkError');
    
    // Should show error message
    cy.contains(/error|failed|try again/i).should('be.visible');
  });

  it('should show loading state during submission', () => {
    const testEmail = 'test@example.com';
    
    // Intercept with delay to test loading state
    cy.intercept('POST', '**/firestore/v1/projects/coach-core-ai/databases/(default)/documents/waitlist**', {
      statusCode: 200,
      body: { name: 'test-doc-id' },
      delay: 2000
    }).as('delayedSubmission');

    cy.get('input[type="email"]').type(testEmail);
    cy.get('button[type="submit"]').click();
    
    // Check for loading state
    cy.get('button[type="submit"]').should('be.disabled');
    cy.contains(/loading|submitting/i).should('be.visible');
    
    cy.wait('@delayedSubmission');
    
    // Check for success message
    cy.contains(/success|thank you/i).should('be.visible');
  });

  it('should clear form after successful submission', () => {
    const testEmail = 'test@example.com';
    
    cy.intercept('POST', '**/firestore/v1/projects/coach-core-ai/databases/(default)/documents/waitlist**', {
      statusCode: 200,
      body: { name: 'test-doc-id' }
    }).as('successfulSubmission');

    cy.get('input[type="email"]').type(testEmail);
    cy.get('button[type="submit"]').click();
    cy.wait('@successfulSubmission');
    
    // Check that form is cleared
    cy.get('input[type="email"]').should('have.value', '');
  });
});

