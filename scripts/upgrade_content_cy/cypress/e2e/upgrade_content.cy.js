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
            cy.log("Checking if retry is needed...", shouldWaitAndRetry);
            cy.wait(1000);
            cy.get('body').then(($body) => {
                if ($body.find('#toolbar-save').length === 0) {
                    cy.log("Edit button not found, save successful!");

                    shouldWaitAndRetry = false; 

                } else {
                    cy.log("Edit button still present, retrying...");
                    if (shouldWaitAndRetry) {
                        cy.log("Retrying save in 5 seconds...");
                        cy.get('#toolbar-save').click({ force: true }); 
                        cy.wait(5000); 
                        checkAndSave(); 
                    } else {
                        cy.log("Content saved successfully, moving to the next link...");
                    }
                }
            });

        });
    };

    it('should edit+save all content types listed', () => {

        cy.intercept('*').as('allRequests');

        // Proces de login
        cy.visit(URL + "/logout"); 
        cy.visit(URL + LOGIN_ROUTE);

        cy.get('#login').type(USERNAME);
        cy.get('#password').type(PASSWORD);
        cy.get('#login-form-submit').click();

        cy.wait(5000); 

   
        if (multiLingual) {
            URL += '/en';
        }

        cy.visit(URL + "/sandbox");
        cy.get('#toolbar-add').click();
        cy.get('#toolbar-add-document').click({ force: true });
        cy.get('.documentFirstHeading').click().type('Upgrade Content');
        cy.get('.text-slate-editor-inner').last().click().type('/Search');
        cy.get('.item.search').click();
        cy.get('.querystring-widget').get('.fields').click();
        cy.get('.fields').contains('div', 'Type').click();

        cy.on('window:alert', (alertText) => {

            if (alertText.includes('Wait')) {
                shouldWaitAndRetry = true;

            } else {
                shouldWaitAndRetry = false;
            }
        });
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

    
        const hrefs = [];
        cy.get('#toolbar-save').click();
        cy.wait(1000); 

        cy.get('.listing-item a')
            .each(($el) => {
                const href = $el.attr('href');
                hrefs.push(href); 
            })
            .then(() => {
                cy.log('Toate href-urile: ', hrefs);
                hrefs.forEach((link) => {
                    const editUrl = URL + link + "/edit";
                    cy.visit(editUrl);
                    cy.intercept('*').as('allRequestsInPage');
                    cy.wait('@allRequestsInPage');
                    cy.wait(5000); 
                    cy.get('#toolbar-save').click({ force: true }); 
                    checkAndSave(); 
                    cy.wait(3000); 
                });
            });
    });
});
