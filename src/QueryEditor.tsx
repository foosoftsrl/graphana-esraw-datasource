import defaults from 'lodash/defaults';

import React, { PureComponent, ChangeEvent } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './DataSource';
import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';
import AceEditor from 'react-ace';
import 'brace/mode/hjson';
import 'brace/theme/monokai';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

interface State {}

export class QueryEditor extends PureComponent<Props, State> {
  onComponentDidMount() {}

  onConfigChange = (event: ChangeEvent) => {
    const { onChange, query } = this.props;
    onChange({ ...query });
  };

  onChange(query: any) {
    const { onChange, onRunQuery } = this.props;
    onChange(query);
    onRunQuery();
  }

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { alias, index, path, x, y, body } = query;

    return (
      <div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">ES index</label>
            <input
              type="text"
              className="gf-form-input"
              value={index}
              placeholder="Immetere indice"
              onChange={(event: ChangeEvent<HTMLInputElement>) => this.onChange({ ...query, index: event.target.value })}
            />
            <label className="gf-form-label query-keyword width-7">Alias</label>
            <input
              type="text"
              className="gf-form-input width-12"
              value={alias}
              placeholder="Alias...."
              onChange={(event: ChangeEvent<HTMLInputElement>) => this.onChange({ ...query, alias: event.target.value })}
            />
          </div>
        </div>

        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Data path</label>
            <input
              type="text"
              className="gf-form-input"
              value={path}
              placeholder="Path to array of key/value pairs"
              onChange={(event: ChangeEvent<HTMLInputElement>) => this.onChange({ ...query, path: event.target.value })}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Time field</label>
            <input
              type="text"
              className="gf-form-input"
              value={x}
              placeholder="Name of the field containing timestamps"
              onChange={(event: ChangeEvent<HTMLInputElement>) => this.onChange({ ...query, x: event.target.value })}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Value field</label>
            <input
              type="text"
              className="gf-form-input"
              value={y}
              placeholder="Name of the field containing value coord"
              onChange={(event: ChangeEvent<HTMLInputElement>) => this.onChange({ ...query, y: event.target.value })}
            />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form gf-form--grow">
            <label className="gf-form-label query-keyword width-7">Body Ace</label>
            <AceEditor
              value={body}
              width="100%"
              mode="hjson"
              enableBasicAutocompletion={true}
              debounceChangePeriod={500}
              theme="monokai"
              onChange={(text: string) => this.onChange({ ...query, body: text })}
            />
          </div>
        </div>
      </div>
    );
  }
}
