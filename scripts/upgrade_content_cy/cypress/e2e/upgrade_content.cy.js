describe('Upgrade content', () => {
  let URL = Cypress.config('baseUrl');
  const USERNAME = Cypress.env('username');
  const PASSWORD = Cypress.env('password');
  const multiLingual = Cypress.env('multiLingual');
  const contentTypes = Cypress.env('contentTypes');
  const LOGIN_ROUTE = Cypress.env('loginRoute');
  let shouldWaitAndRetry = false;
  Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
  });
  const checkAndSave = () => {
    cy.wrap(null).then(() => {
      cy.log('Checking if retry is needed...', shouldWaitAndRetry);
      cy.wait(1000);
      cy.get('body').then(($body) => {
        if ($body.find('#toolbar-save').length === 0) {
          cy.log('Edit button not found, save successful!');
          shouldWaitAndRetry = false;
        } else {
          cy.log('Edit button still present, retrying...');
          if (shouldWaitAndRetry) {
            cy.log('Retrying save in 5 seconds...');
            cy.get('#toolbar-save').click({ force: true });
            cy.wait(5000);
            checkAndSave();
          } else {
            cy.log('Content saved successfully, moving to the next link...');
          }
        }
      });
    });
  };

  it('should edit+save all content types listed', () => {
    cy.intercept('*').as('allRequests');
    cy.visit(URL + '/logout');
    cy.visit(URL + LOGIN_ROUTE);

    cy.get('#login').type(USERNAME);
    cy.get('#password').type(PASSWORD);
    cy.get('#login-form-submit').click();

    cy.wait(5000);
    if (multiLingual) {
      URL += '/en';
    }

    cy.visit(URL + '/sandbox');
    cy.get('#toolbar-add').click();
    cy.get('#toolbar-add-document').click({ force: true });
    cy.get('.documentFirstHeading').click().type('Upgrade Content');
    cy.get('.text-slate-editor-inner').last().click().type('/Search');
    cy.get('.item.search').click();
    cy.get('#field-query-0-query').click();
    cy.get('.fields').contains('div', 'Type').click();

    cy.on('window:alert', (alertText) => {
      if (alertText.includes('Wait')) {
        shouldWaitAndRetry = true;
      } else {
        shouldWaitAndRetry = false;
      }
    });

    cy.get('#field-listingBodyTemplate').click();
    cy.contains('div', 'Listing').click();
    cy.get('input[name="field-hasLink-1-itemModel"]').click({ force: true });
    contentTypes.forEach((contentTypeName) => {
      cy.get('.querystring-widget .fields .field')
        .eq(2)
        .should('exist')
        .then(($el) => {
          const width = $el.width();
          const height = $el.height();
          cy.wrap($el).click(width - 1, height - 1);
        });

      cy.get('.fields').contains('div', contentTypeName).click();
      cy.wait(2000);
    });

    let resultsNumber = 1000;
    cy.get('h4.search-details')
      .invoke('text')
      .then((text) => {
        resultsNumber = text.match(/\d+/)[0];
        cy.get('#field-b_size-4-query').type(resultsNumber);
        cy.wait(5000);
      });
    const hrefs = [];
    cy.get('#toolbar-save').click();
    cy.wait(1000);

    cy.get('.ui.fluid.card.u-card')
      .each(($el) => {
        const img = $el.find('img');
        if (img.attr('src').includes('/static/media/default-image')) {
          const link = $el.find('a').attr('href');
          if (link && link.indexOf('sandbox') === -1 && link.indexOf('antimicrobial') === -1) {
            hrefs.push(link);
          }
        }
      })
      .then(() => {
        hrefs.forEach((link) => {
          const editUrl = URL + link + '/edit';
          cy.visit(editUrl);
          cy.wait(1000);
          cy.intercept('*').as('allRequestsInPage');
          cy.scrollTo('bottom', { duration: 2000 });

          cy.scrollTo('top', { duration: 2000 });
          cy.wait(3000);

          cy.scrollTo('bottom', { duration: 2000 });
          cy.wait(2000);

          //   cy.wait('@allRequestsInPage');
          cy.scrollTo('top', { duration: 2000 });
          cy.wait(3000);

          cy.get('#toolbar-save').click({ force: true });
          checkAndSave();

          cy.wait(3000);
        });
      });
  });
});
