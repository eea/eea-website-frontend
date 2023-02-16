/**
 * Routes.
 * @module routes
 */

import { matchPath } from 'react-router';
import { App } from '@plone/volto/components';
import { defaultRoutes } from '@plone/volto/routes';
import config from '@plone/volto/registry';

/**
 * Routes array.
 * @array
 * @returns {array} Routes.
 */

const filterRoutes = (route) => {
  const { purgeRoutes } = config.settings;
  if (purgeRoutes.length) {
    const matched = purgeRoutes.some((item) => {
      const matchedPath = matchPath(item, {
        path: route.path,
        exact: true,
        strict: true,
      });
      // replace () from multilingual routes. see: https://github.com/plone/volto/blob/0c5361725c3a70f2cd60c9144d8859ed107ae335/src/routes.js#L65
      return matchedPath?.path?.replace(/["'()]/g, '') === item;
    });
    return matched ? false : true;
  } else return true;
};
const routes = [
  {
    path: '/',
    component: App, // Change this if you want a different component
    routes: [
      // Add your routes here
      ...(config.addonRoutes || []),
      ...defaultRoutes,
    ].filter(filterRoutes),
  },
];

export default routes;
