import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useUpload from './useUpload';

// Mock FormData to capture appended values
class MockFormData {
  constructor() {
    this._entries = [];
  }
  append(key, value) {
    this._entries.push([key, value]);
  }
}

describe('useUpload (React Native asset)', () => {
  const originalFetch = global.fetch;
  const originalFormData = global.FormData;

  beforeEach(() => {
    global.FormData = MockFormData;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://ucarecdn.com/test-uuid/', mimeType: 'image/jpeg' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.FormData = originalFormData;
    jest.resetAllMocks();
  });

  function TestHarness() {
    const [upload] = useUpload();
    React.useEffect(() => {
      (async () => {
        await upload({
          reactNativeAsset: {
            uri: 'file:///var/mobile/Containers/Data/Application/XXXX/tmp/image.jpg',
            mimeType: 'image/jpeg',
            fileName: 'image.jpg',
          },
        });
      })();
    }, [upload]);
    return null;
  }

  it('posts FormData to the platform upload endpoint and returns a URL', async () => {
    render(
      <SafeAreaProvider initialMetrics={{
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
        <TestHarness />
      </SafeAreaProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const [calledUrl, options] = global.fetch.mock.calls[0];
    expect(calledUrl).toBe('/_create/api/upload/');
    expect(options.method).toBe('POST');

    // Ensure a FormData-like body was sent and contains a file entry
    const body = options.body;
    expect(body).toBeInstanceOf(MockFormData);
    // Our MockFormData stores entries as [key, value]
    const fileEntry = body._entries.find(([k]) => k === 'file');
    expect(fileEntry).toBeDefined();
    const fileObj = fileEntry[1];
    expect(fileObj).toMatchObject({
      uri: expect.any(String),
      name: expect.any(String),
      type: 'image/jpeg',
    });
  });
});
