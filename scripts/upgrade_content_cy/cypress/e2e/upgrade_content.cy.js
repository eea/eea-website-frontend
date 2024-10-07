describe('Upgrade content', () => {

    let URL = Cypress.config('baseUrl');
    const USERNAME = Cypress.env('username');
    const PASSWORD = Cypress.env('password');
    const multiLingual = Cypress.env('multiLingual');
    const contentTypes = Cypress.env('contentTypes');
    const LOGIN_ROUTE = Cypress.env('loginRoute');
    let shouldWaitAndRetry = false;

    // Ignoră anumite erori
    Cypress.on('uncaught:exception', (err, runnable) => {
        return false;
    });

    // Funcția pentru așteptare și retry
    const checkAndSave = () => {
        // Verificăm dacă este necesar retry-ul pe baza flag-ului "shouldWaitAndRetry"

        cy.wrap(null).then(() => {
            cy.log("Checking if retry is needed...", shouldWaitAndRetry);
            cy.wait(1000);
            cy.get('body').then(($body) => {
                if ($body.find('#toolbar-save').length === 0) {
                    cy.log("Edit button not found, save successful!");

                    shouldWaitAndRetry = false; // Dacă butonul de editare nu mai este, salvarea a reușit

                } else {
                    cy.log("Edit button still present, retrying...");
                    if (shouldWaitAndRetry) {
                        cy.log("Retrying save in 5 seconds...");

                        cy.get('#toolbar-save').click({ force: true }); // Încearcă să salvezi din nou
                        cy.wait(5000); // Așteaptă câteva secunde înainte de a încerca din nou
                        // După salvare, verificăm dacă opțiunea de edit a dispărut
                        checkAndSave(); // Retry doar dacă este necesar
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
        cy.visit(URL + "/logout"); // Asigură-te că ești deconectat
        cy.visit(URL + LOGIN_ROUTE);

        cy.get('#login').type(USERNAME);
        cy.get('#password').type(PASSWORD);
        cy.get('#login-form-submit').click(); // Cypress va încerca automat dacă nu merge imediat

        cy.wait(5000); // Așteaptă procesarea login-ului

        // Setează URL-ul corect dacă este multi-lingual
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

        // Capturăm alertele cu cy.on și setăm flag-ul shouldWaitAndRetry dacă alerta conține "Wait"
        cy.on('window:alert', (alertText) => {

            if (alertText.includes('Wait')) {
                shouldWaitAndRetry = true;

            } else {
                shouldWaitAndRetry = false;
            }
        });

        // Iterează peste tipurile de conținut și efectuează acțiuni secvențial
        contentTypes.forEach((contentTypeName) => {
            cy.get('.querystring-widget .fields .field')
                .eq(2)
                .should('exist')
                .then(($el) => {
                    const width = $el.width();
                    const height = $el.height();
                    cy.wrap($el).click(width - 1, height - 1); // Click pe câmp în colțul din dreapta jos
                });

            cy.get('.fields').contains('div', contentTypeName).click();
            cy.wait(2000); // Mică pauză pentru UI
        });

        // Salvează conținutul și colectează linkurile
        const hrefs = [];
        cy.get('#toolbar-save').click();
        cy.wait(1000); // Așteaptă completarea acțiunii de salvare

        cy.get('.listing-item a')
            .each(($el) => {
                const href = $el.attr('href');
                hrefs.push(href); // Colectează toate href-urile
            })
            .then(() => {
                cy.log('Toate href-urile: ', hrefs);

                // Parcurge linkurile secvențial și efectuează modificări
                hrefs.forEach((link) => {
                    const editUrl = URL + link + "/edit";
                    cy.visit(editUrl);

                    cy.intercept('*').as('allRequestsInPage');
                    cy.wait('@allRequestsInPage');
                    cy.wait(5000); // Așteaptă încărcarea completă a paginii

                    cy.get('#toolbar-save').click({ force: true }); // Încearcă să salvezi conținutul

                    // Verificăm dacă este necesar retry la salvare pe baza alertelor
                    checkAndSave(); // Încearcă să salvezi din nou dacă e necesar

                    cy.wait(3000); // Pauză înainte de a trece la următorul link
                });
            });
    });
});
