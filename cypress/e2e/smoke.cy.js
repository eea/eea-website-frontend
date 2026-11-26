describe('Volto 19 frontend smoke test', () => {
  it('serves and hydrates the homepage without a compilation error', () => {
    cy.request('/').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.include('<!doctype html');
      expect(response.body).not.to.include('Failed to compile');
    });

    cy.visit('/');
    cy.document().its('readyState').should('eq', 'complete');
    cy.get('body').should('be.visible');
    cy.get('body').should('not.contain.text', 'Failed to compile');
    cy.get('body').should('not.contain.text', 'Unexpected error');
  });
});
