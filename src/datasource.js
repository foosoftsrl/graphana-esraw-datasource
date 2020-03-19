import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = {'Content-Type': 'application/json'};
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  query(options) {
    console.log('Querying with options', options)
    console.log('Targets', options.targets)
    console.log('X', options.targets[0].x);
    console.log('Y', options.targets[0].y);
    console.log('Path', options.targets[0].path);
    console.log('Index', options.targets[0].index)
    const xKey = options.targets[0].x
    const yKey = options.targets[0].y
    const path = options.targets[0].path
    const index = options.targets[0].index
    var query = options// = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);
    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    if (this.templateSrv.getAdhocFilters) {
      query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    } else {
      query.adhocFilters = [];
    }
    
    // Make sure that the range is defined  
    if (options && options.range && options.range.from && options.range.to) {
      // Get full body
      //const body = options.targets[3].target
      const gte = new Date(options.range.from._d).toISOString();
      const lt = new Date(options.range.to._d).toISOString();
      //body.replace('{gte}', gte)
      //body.replace('{lt}', lt)
      const mapScript =  [
        'if(doc["@timestamp"].size() != 1 || doc["requestTime"].size() != 1)',
        'return;',
        'long durationSecs = doc["requestTime"].value;',
        'long docEnd = doc["@timestamp"].value.toInstant().toEpochMilli();',
        'long docStart = docEnd - durationSecs * 1000l;',
        'long bucketSize = 1000 * 60 * 60 * 1l;', // one hour
        'long bucketStart = Math.round(docStart / bucketSize) * bucketSize;',
        'long bucketEnd = bucketStart + bucketSize;',
        'long numSteps = durationSecs * 1000l / bucketSize;',
        'while(bucketStart < docEnd) {',
        'def overlap = Math.min(bucketEnd, docEnd) - Math.max(bucketStart,docStart);',
        'if(overlap > 0) {', 
        'def overlapFraction = ((double)overlap) / bucketSize;',
        'String key = Long.toString(bucketStart);',
        'if (state.map.containsKey(key))',
        'state.map[key] += overlapFraction;',
        'else',
        'state.map[key] = overlapFraction;',
        '}',
        'bucketStart = bucketEnd;',
        'bucketEnd += bucketSize;',
        '}'
      ]
      const reduceScript = [
        'def reduceMap = [:];',
        'for (map in states) {',
        'for (entry in map.entrySet()) {',
        'def keyAsStr = Instant.ofEpochMilli(Long.parseLong(entry.getKey())).toString();',
        'if (!reduceMap.containsKey(keyAsStr))  {',
        'reduceMap[keyAsStr] = [:];',
        'reduceMap[keyAsStr].key = Long.parseLong(entry.getKey());',
        'reduceMap[keyAsStr].key_as_string = keyAsStr;',
        'reduceMap[keyAsStr].count = entry.getValue();',
        '} else {',
        'reduceMap[keyAsStr].count += entry.getValue();',
        '}',
        '}',
        '}',
        'def buckets = new ArrayList(reduceMap.values());',
        'buckets.sort((a,b)->Long.compare(a.key, b.key));',
        'return buckets;'
      ]

      // Make request to Elastic Search
      return this.doRequest({
        // TODO: radio must be a parameter. Ideally should request to Elastich search the available id:bn
        url: `${this.url}/${index}/_search`,
        data: 
          {
            query: {
              range: {
                "@timestamp": {
                  gte,
                  lt
                }
              }
            },
          aggs: {
            range: {
              scripted_metric: {
                init_script: "state.map = [:]",
                combine_script: "state.map",
                map_script: mapScript.join('\n'),
                reduce_script: reduceScript.join('\n') 
              }
            }
          }
        },
        method: 'POST'
      }).then(res => {
        console.log('Got elastich search result')
        console.log('Options', options)
        console.log('Targets', options.targets)
        console.log('Target', options.targets[0])
        console.log('X key', xKey)
        console.log('Y key', yKey)
        console.log('Path', path)
        // Get path
        const path = options.targets[0].path
        console.log('Path', path)
        const value = _.get(res.data, path)
        console.log('Path value', value)
        // Get x/y keys
        const xKey = options.targets[0].x
        const yKey = options.targets[0].y
        console.log('x key', xKey);
        console.log('y key', yKey);
        // Map the data points to a timeserie
        const dataPoints = value.map(v => [v[xKey], v[yKey]])
        return {data:[
            {
              datapoints:dataPoints
            }
          ]
        }
      }) 
    }
  }

  testDatasource() {
    return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }

  annotationQuery(options) {
    console.log('Calling annotations function');
    var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
    var annotationQuery = {
      range: options.range,
      annotation: {
        name: options.annotation.name,
        datasource: options.annotation.datasource,
        enable: options.annotation.enable,
        iconColor: options.annotation.iconColor,
        query: query
      },
      rangeRaw: options.rangeRaw
    };

    return this.doRequest({
      url: this.url + '/annotations',
      method: 'POST',
      data: annotationQuery
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(query) {
    var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
    };
    
    return Promise.resolve([{text: 'upper_75', value: '1'}, {text: 'upper_90', value: '2'}]) 
     // new Promise((resolve, reject) => {
     // resolve(['upper_75', 'upper_90'])
    //})
    //return this.doRequest({
    //  url: this.url + '/search',
    //  data: interpolated,
    //  method: 'POST',
    //}).then(this.mapToTextValue);
  }

  mapToTextValue(result) {
    return _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        return { text: d, value: i};
      }
      return { text: d, value: d };
    });
  }

  doRequest(options) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeserie'
      };
    });

    options.targets = targets;

    return options;
  }

  getTagKeys(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-keys',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

  getTagValues(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-values',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

}
