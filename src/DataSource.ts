import _ from 'lodash';

import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings } from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';

import * as hjson from 'hjson';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  name: any;
  url: any;
  basicAuth: any;
  withCredentials: any;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>, private templateSrv: any, private backendSrv: any) {
    super(instanceSettings);

    // General data source settings
    this.name = instanceSettings.name;
    this.url = instanceSettings.url;
    this.basicAuth = instanceSettings.basicAuth;
    this.withCredentials = instanceSettings.withCredentials;
  }

  query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    //const { range } = options;
    //const from = range!.from.valueOf();
    //const to = range!.to.valueOf();
    const targets = options.targets.filter(t => {
      return !t.hide;
    });
    if (targets.length <= 0) {
      return Promise.resolve({ data: [] });
    }

    let reqContent = '';
    targets.forEach(target => {
      reqContent += JSON.stringify({ index: target.index }) + '\n';
      // Interpolate body
      const bodyHjson = this.templateSrv.replace(target.body, {}, 'glob');
      // Parse hjson body to a javacript variable
      const bodyObject = hjson.parse(bodyHjson);
      // Concatenate body
      reqContent += JSON.stringify(bodyObject) + '\n';
    });
    // Make request to Elastic Search
    return this.doRequest({
      url: this.url + '/_msearch',
      data: reqContent,
      method: 'POST',
    }).then((res: any) => {
      return this.mapResponse(targets, res);
    });
  }

  doRequest(options: any) {
    options.withCredentials = this.withCredentials;
    //options.headers = this.headers;
    return this.backendSrv.datasourceRequest(options);
  }

  // Convert ES response to grafana DataSourceResponse
  mapResponse(targets: any, res: any) {
    const resultArray = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const targetResponse = res.data.responses[i];
      const path = target.path;
      if (!path) {
        throw new Error('No path option');
      }
      console.log('Path', path);
      const value = _.get(targetResponse, path);
      if (!value) {
        throw new Error('No data @path ' + path);
      }
      if (!Array.isArray(value)) {
        throw new Error('Not an array @' + path);
      }
      // Get x/y keys
      const xKey = target.x;
      const yKey = target.y;
      // Map the data points to a timeserie
      if (value.length) {
        if (!(xKey in value[0])) {
          throw new Error("Can't find '" + xKey + "' property in response");
        }
        if (!(yKey in value[0])) {
          throw new Error("Can't find '" + yKey + "' property in response");
        }
      }
      const dataPoints = value.map(v => [v[yKey], v[xKey]]);
      const targetData = {
        target: 'pippo',
        datapoints: dataPoints,
      };
      resultArray.push(targetData);
    }
    return { data: resultArray };
  }

  testDatasource() {
    return this.doRequest({ url: this.url + '/', method: 'GET' }).then((response: any) => {
      if (response.status === 200) {
        return { status: 'success', message: 'Data source is working', title: 'Success' };
      } else {
        throw new Error('Invalid response status ' + response.status);
      }
    });
  }
}
