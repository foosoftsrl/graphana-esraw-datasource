import React, { PureComponent, ChangeEvent } from 'react';
import { DataSourcePluginOptionsEditorProps, DataSourceJsonData } from '@grafana/data';
import { DataSourceHttpSettings } from '@grafana/ui';

interface Props extends DataSourcePluginOptionsEditorProps<DataSourceJsonData> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      path: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  // Secure field (only sent to th ebackend)
  onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        apiKey: event.target.value,
      },
    });
  };

  onResetAPIKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
    });
  };

  render() {
    const { options, onOptionsChange } = this.props;
    return (
      <>
        <DataSourceHttpSettings
          defaultUrl={'http://localhost:9200'}
          dataSourceConfig={options}
          showAccessOptions={true}
          onChange={onOptionsChange}
        />
      </>
    );
  }
}
