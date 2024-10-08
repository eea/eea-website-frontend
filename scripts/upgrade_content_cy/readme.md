
# Cypress Content Type Editor Script

This project uses Cypress to Script the editing and resaving of content types listed in the `CYPRESS_CONTENT_TYPES` environment variable. The Scripts will log in, access the specified content types, edit them, and resave them. After resaving, the Scripts will re-run the save process for each content type in the list.

## Requirements

1. [Node.js](https://nodejs.org/) installed.
2. Cypress installed:
   ```bash
   npm install cypress --save-dev
   ```
3. Create a `.env` file in the root of the project (see below for more details).

## Setup

1. **Install dependencies**:
   Run the following command to install Cypress and other necessary dependencies:
   ```bash
   npm install
   ```

2. **Create a `.env` file**:
   Create a `.env` file in the root directory of your project and define the necessary environment variables as described below.

   Example `.env` file:
   ```bash
   CYPRESS_URL=https://staging.eea.europa.eu
   CYPRESS_LOGIN_ROUTE=/fallback_login
   CYPRESS_USERNAME=your-username-here
   CYPRESS_PASSWORD=your-password-here
   CYPRESS_MULTILINGUAL=true
   CYPRESS_CONTENT_TYPES=Map (interactive),Dashboard,Chart (interactive),Map (simple)
   ```

3. **Run Cypress Scripts**:
   To run the Scripts, use the following command:
   ```bash
   npx cypress open
   ```
   This will open the Cypress Script Runner, where you can select and run the Scripts.

## Environment Variables

Here’s a table that describes the environment variables used in the `.env` file:

| Environment Variable       | Description                                                                                              | Example Value                            |
|----------------------------|----------------------------------------------------------------------------------------------------------|------------------------------------------|
| `CYPRESS_URL`               | The base URL of the application under Script.                                                              | `https://staging.eea.europa.eu`          |
| `CYPRESS_LOGIN_ROUTE`       | The relative path for the login route. This is where Cypress will navigate to perform login operations.  | `/fallback_login`                        |
| `CYPRESS_USERNAME`          | The username for authentication in the application.                                                      | `your-username-here`                     |
| `CYPRESS_PASSWORD`          | The password for authentication in the application.                                                      | `your-password-here`                     |
| `CYPRESS_MULTILINGUAL`      | Boolean indicating if the platform supports multiple languages.                                           | `true` or `false`                        |
| `CYPRESS_CONTENT_TYPES`     | A comma-separated list of content types that will be Scripted, edited, and resaved.                        | `Map (interactive),Dashboard,Chart (interactive),Map (simple)` |

### How the Scripts Work

1. **Login**:
   The Script begins by navigating to the `CYPRESS_URL` + `CYPRESS_LOGIN_ROUTE` and authenticating using the credentials provided in `CYPRESS_USERNAME` and `CYPRESS_PASSWORD`.

2. **Content Type Editing**:
   Once logged in, the Script script iterates through each content type in the `CYPRESS_CONTENT_TYPES` array. For each content type:
   - The Script navigates to the  content type pages.
   - Performs edits on the content.
   - Saves the changes.

3. **Resaving**:
   After the initial save, the Script re-runs the save process for each content type to ensure that the changes are consistently applied.
