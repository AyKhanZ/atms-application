import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, Params } from '@angular/router';

// true = any param change makes a new page, a list = only those params do
export const recreateOnParamChange = 'recreateOnParamChange';

// angular keeps the page when only params change, bad for pages built around one id
// (search from one project to another kept the old project on screen), so such routes get a new page
@Injectable()
export class AppRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    current: ActivatedRouteSnapshot,
  ): boolean {
    if (future.routeConfig !== current.routeConfig) return false;

    const watched = future.data[recreateOnParamChange] as boolean | readonly string[] | undefined;
    if (!watched) return true;

    const names = watched === true ? Object.keys({ ...future.params, ...current.params }) : watched;
    return sameParams(future.params, current.params, names);
  }
}

function sameParams(left: Params, right: Params, names: readonly string[]): boolean {
  return names.every((name) => left[name] === right[name]);
}
