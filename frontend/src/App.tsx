import { useState, useEffect } from 'react';
import { ListFiles, SetDropboxIgnored, RemoveDropboxIgnored, SelectFolder, CancelSearch } from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { TextField, Button, IconButton, List, ListItem, Typography, Box, useTheme } from '@mui/material';
import { Clear } from '@mui/icons-material';

function App() {
  const theme = useTheme();
  const [keyword, setKeyword] = useState<string>(localStorage.getItem('keyword') || '');
  const [isSearcing, setIsSearcing] = useState<boolean>(false);
  const [path, setPath] = useState<string>(localStorage.getItem('path') || '');
  const [files, setFiles] = useState<Array<[string, boolean]>>([]);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('keyword', keyword);
  }, [keyword]);

  useEffect(() => {
    localStorage.setItem('path', path);
  }, [path]);

  const handleSelectFolder = async () => {
    const result = await SelectFolder();
    if (result) {
      setPath(result);
    }
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

  useEffect(() => {
    const unsubscribe = EventsOn('fileCount', (count) => {
      setMessage(`Searching... ${count}`);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <TextField
          label='Dropbox folder or selected folder path'
          value={path}
          onChange={(e) => setPath(e.target.value)}
          sx={{ width: '100%', mr: 1 }}
          size='small'
          autoComplete='on'
          InputProps={{
            ...(path !== '' && {
              endAdornment: (
                <IconButton onClick={() => setPath('')} size='small'>
                  <Clear fontSize='small' />
                </IconButton>
              ),
            }),
          }}
        />
        <Button variant='outlined' onClick={handleSelectFolder} sx={{ width: 100 }} size='small'>
          Select
        </Button>
      </Box>

      <Box
        sx={{
          height: 'calc(100vh - 180px)',
          overflow: 'auto',
          mt: 2,
          border: `1px solid ${theme.palette.action.disabled}`,
          borderRadius: 1,
        }}
      >
        <List>
          {files.map(([file, ignored], index) => (
            <ListItem key={index} sx={{ color: ignored ? theme.palette.primary.main : theme.palette.text.primary }}>
              {file}
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
        <TextField
          label='Keyword (Folder or file name. Separate with ";" if you want to search multiple keywords.)'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          sx={{ width: '100%', mr: 1 }}
          size='small'
          autoComplete='on'
          InputProps={{
            ...(keyword !== '' && {
              endAdornment: (
                <IconButton onClick={() => setKeyword('')} size='small'>
                  <Clear fontSize='small' />
                </IconButton>
              ),
            }),
          }}
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
      <Typography variant='body1' sx={{ mt: 1 }}>
        {message}
      </Typography>
    </Box>
  );
}

export default App;
