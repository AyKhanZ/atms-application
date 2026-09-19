import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, Params } from '@angular/router';

/**
 * Route data key. `true`: a change of any of the route's parameters opens a fresh page. A list of
 * names: only a change of those does; the rest the page follows itself.
 */
export const recreateOnParamChange = 'recreateOnParamChange';

/**
 * Angular keeps a page when only its parameters change. That suits a page that follows its
 * parameters, like task details moving between a task and its subtasks. It does not suit one
 * built around a single id: going from one project to another through search changed the address
 * and kept the old project on screen, and a ticket of another project was asked for under the old
 * project's id. Such a route names what it cannot follow and gets a new page, with its own tabs
 * and state, when that changes.
 */
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
