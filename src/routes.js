/**
 * Routes.
 * @module routes
 */

import { matchPath } from 'react-router';
import { intersection, isArray } from 'lodash';
import { App } from '@plone/volto/components';
import { defaultRoutes } from '@plone/volto/routes';
import config from '@plone/volto/registry';

/**
 * Routes array.
 * @array
 * @returns {array} Routes.
 */

//TODO: try to use matchPath
const filterRoutes = (route) => {
  const { purgeRoutes } = config.settings;
  if (purgeRoutes?.length) {
    if (isArray(route.path)) {
      if (intersection(route.path, purgeRoutes).length) {
        return false;
      } else return true;
    } else return !purgeRoutes.includes(route.path);
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
