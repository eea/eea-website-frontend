let URL = "https://staging.eea.europa.eu";
const LOGIN_ROUTE = "/fallback_login"; //login 
const USERNAME = "";
const multiLingual = true;
const PASSWORD = "";
const contentTypes = ['Map (interactive)', 'Dashboard', 'Chart (interactive)', 'Map (simple)']

describe('Upgrade content', () => {

    Cypress.on('uncaught:exception', (err, runnable) => {

        if (err.message.includes('404') || err.message.includes('Not Found')) {
            return false;
        }


        if (err.message.includes('Uncaught (in promise)')) {
            return false;
        }

        return true;
    });
    it('should edit+save all content types listed', () => {
        cy.intercept('*').as('allRequests');

        cy.visit(URL + "/logout");
        cy.visit(URL + LOGIN_ROUTE);


        cy.get('#login')
            .type(USERNAME);
        cy.get('#password')
            .type(PASSWORD);

        try {
            cy.get('#login-form-submit')
                .click();
        }
        catch (err) {

        }
        cy.wait(5000);

        cy.visit(URL)
        if (multiLingual)
            URL += '/en';
        cy.visit(URL + "/sandbox")
        cy.get('#toolbar-add').click();
        cy.get('#toolbar-add-document').click({ force: true });
        cy.get('.documentFirstHeading').click().type('Upgrade Content');
        cy.get('.text-slate-editor-inner').last().click().type('/Search')
        cy.get('.item.search').click()
        cy.get('.querystring-widget').get('.fields').click();
        cy.get('.fields').contains('div', 'Type').click();

        contentTypes.forEach((contentTypeName) => {
            cy.get('.querystring-widget .fields .field')
                .eq(2)
                .should('exist').then(($el) => {
                    const width = $el.width();
                    const height = $el.height();


                    cy.wrap($el).click(width - 1, height - 1);
                });

            cy.get('.fields').contains('div', contentTypeName).click();
            cy.wait(2000)
        })

        const hrefs = []
        cy.get('#toolbar-save').click()
        cy.wait(1000)
        cy.get('.listing-item a')
            .each(($el) => {
                const href = $el.attr('href');
                hrefs.push(href);
            })
            .then(() => {
                cy.log('All hrefs: ', hrefs);
                hrefs.forEach((link) => {
                    const editUrl = URL + link + "/edit";
                    cy.visit(editUrl);
                    cy.intercept('*').as('allRequestsInPage');
                    cy.wait('@allRequestsInPage');
                    if (contentTypes === "Map (simple)")
                        cy.wait(15000)
                    cy.get('#toolbar-save').click({ force: true });
                    cy.intercept('*').as('allRequestsInPageSaved');
                    cy.wait('@allRequestsInPageSaved');

                });
            });

    });



});
