import { useState, useEffect, useMemo } from 'react';
import { ListFiles, SetDropboxIgnored, RemoveDropboxIgnored, SelectFolder, CancelSearch } from '../wailsjs/go/main/App';
import { EventsOn, WindowSetLightTheme, WindowSetDarkTheme, BrowserOpenURL } from '../wailsjs/runtime/runtime';
import {
  Autocomplete,
  TextField,
  Button,
  List,
  ListItem,
  Typography,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { DarkModeSwitch } from './DarkModeSwitch';

function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem('isDarkMode') === 'true' || false);
  const [keyword, setKeyword] = useState<string>(localStorage.getItem('keyword') || '');
  const [isSearcing, setIsSearcing] = useState<boolean>(false);
  const [path, setPath] = useState<string>(localStorage.getItem('path') || '');
  const [files, setFiles] = useState<Array<[string, boolean]>>([]);
  const [message, setMessage] = useState<string>('');
  const [pathHistory, setPathHistory] = useState<string[]>(JSON.parse(localStorage.getItem('pathHistory') || '[]'));
  const [keywordHistory, setKeywordHistory] = useState<string[]>(JSON.parse(localStorage.getItem('keywordHistory') || '[]'));

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
        },
      }),
    [isDarkMode]
  );

  useEffect(() => {
    localStorage.setItem('keyword', keyword);
  }, [keyword]);

  useEffect(() => {
    localStorage.setItem('path', path);
  }, [path]);

  useEffect(() => {
    localStorage.setItem('isDarkMode', isDarkMode.toString());
    if (isDarkMode) {
      WindowSetDarkTheme();
    } else {
      WindowSetLightTheme();
    }
  }, [isDarkMode]);

  const handleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSelectFolder = async () => {
    const result = await SelectFolder();
    if (result) {
      setPath(result);
      updateHistory(pathHistory, setPathHistory, result, 'pathHistory');
    }
  };

  const openInExplorer = (path: string) => {
    const isWindows = navigator.userAgent.includes('Windows');
    const url = isWindows ? `file:///${path}` : `file://${path}`;
    BrowserOpenURL(url);
  };

  const handleSearch = async () => {
    try {
      if (isSearcing) {
        setIsSearcing(false);
        await CancelSearch();
        return;
      }
      if (keyword === '') {
        setMessage('Keyword is empty');
        return;
      }
      if (path === '') {
        setMessage('Dropbox path is empty');
        return;
      }
      updateHistory(keywordHistory, setKeywordHistory, keyword, 'keywordHistory');
      setIsSearcing(true);
      const result: Array<[string, boolean]> = await ListFiles(path, keyword);
      if (result === null) {
        setMessage('null');
        return;
      }
      if (result.length === 0) {
        setMessage('No files found.');
        return;
      }
      setFiles(result);
      setMessage('');
      setIsSearcing(false);
    } catch (error) {
      if (error === 'context canceled') {
        setMessage('Search canceled');
        return;
      }
      setMessage(`Error: ${error}`);
    }
  };

  const handleIgnore = async () => {
    try {
      const result: string[] = await SetDropboxIgnored(files.map((file) => file[0]));
      setMessage(result.length + ' files (or folders) ignored.');
      setFiles(files.map((file) => [file[0], true]));
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  const handleUnignore = async () => {
    try {
      const result: string[] = await RemoveDropboxIgnored(files.map((file) => file[0]));
      setMessage(result.length + ' files (or folders) unignored.');
      setFiles(files.map((file) => [file[0], false]));
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  const updateHistory = (
    history: string[],
    setHistory: React.Dispatch<React.SetStateAction<string[]>>,
    newItem: string,
    key: string
  ) => {
    const updatedHistory = [newItem, ...history.filter((item) => item !== newItem)].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem(key, JSON.stringify(updatedHistory));
  };

  useEffect(() => {
    const unsubscribe = EventsOn('fileCount', (count) => {
      setMessage(`Searching... ${count}`);
    });
    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Autocomplete
            freeSolo
            sx={{ width: '100%', mr: 1 }}
            options={pathHistory}
            value={path}
            onInputChange={(_, newValue) => setPath(newValue)}
            renderInput={(params) => <TextField {...params} label='Selected folder path' size='small' />}
          />
          <Button variant='outlined' onClick={handleSelectFolder} sx={{ width: 100 }} size='small'>
            Select
          </Button>
        </Box>

        <Box
          sx={{
            height: 'calc(100vh - 178px)',
            overflow: 'auto',
            mt: 2,
            border: `1px solid ${theme.palette.action.disabled}`,
            borderRadius: 1,
          }}
        >
          <List>
            {files.map(([file, ignored], index) => (
              <ListItem
                key={index}
                sx={{
                  color: ignored ? theme.palette.primary.main : theme.palette.text.primary,
                  '&:hover': { backgroundColor: theme.palette.action.hover },
                }}
              >
                <Typography variant='body1' sx={{ cursor: 'pointer' }} onClick={() => openInExplorer(file)}>
                  {file}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
          <Autocomplete
            freeSolo
            options={keywordHistory}
            value={keyword}
            onInputChange={(_, newValue) => setKeyword(newValue)}
            sx={{ width: '100%', mr: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label='Search Keyword (Folder or file name. Separate with ";" for multiple keywords.)'
                size='small'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            )}
          />
          <Button variant='outlined' onClick={handleSearch} sx={{ width: 140, mr: 1 }} size='small'>
            {isSearcing ? 'Cancel' : 'Search'}
          </Button>
          <Button
            variant='contained'
            color='primary'
            onClick={handleIgnore}
            disabled={files.length === 0 || isSearcing}
            sx={{ width: 140, mr: 1 }}
            size='small'
          >
            Ignore
          </Button>
          <Button
            variant='contained'
            color='secondary'
            onClick={handleUnignore}
            disabled={files.length === 0 || isSearcing}
            sx={{ width: 140 }}
            size='small'
          >
            Unignore
          </Button>
        </Box>
        <Box sx={{ mt: 1 }}>
          <Typography variant='body1'>{message}</Typography>
          <Box sx={{ position: 'absolute', right: 0, bottom: 10, mr: 1 }}>
            <DarkModeSwitch onChange={handleDarkMode} checked={isDarkMode} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
