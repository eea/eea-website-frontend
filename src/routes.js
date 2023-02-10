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
      console.log(matchedPath);
      return matchedPath?.path === item;
    });
    return matched ? false : true;
  }
  // config.settings.purgeRoutes.length
  //   ? {

  //       // ...route,
  //       // path: Array.isArray(route.path)
  //       //   ? route.path.map((path) => `${config.settings.prefixPath}${path}`)
  //       //   : `${config.settings.prefixPath}${route.path}`,
  //     }
  //   : route,
  else return true;
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
console.log(routes);

export default routes;
