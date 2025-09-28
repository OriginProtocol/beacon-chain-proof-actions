'use client'; // Client component for state and fetching

import { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import { DataGrid } from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
// Dialog components disabled due to React 19 SSR compatibility issues
// import Dialog from '@mui/material/Dialog';
// import DialogTitle from '@mui/material/DialogTitle';
// import DialogContent from '@mui/material/DialogContent';
// import IconButton from '@mui/material/IconButton';
// import CloseIcon from '@mui/icons-material/Close';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// import { timeAgo } from "../utils/time"; // Temporarily disabled to test

const timeAgo = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return dateString;
  }
};

export default function Home() {
  // Repository update state
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  // Job runs state
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({
    page: 0, // 0-based for DataGrid
    pageSize: 10,
  });
  const [jobNames, setJobNames] = useState([]); // List of {name, count}
  const [selectedJobName, setSelectedJobName] = useState(null); // Currently selected filter
  const [selectedRun, setSelectedRun] = useState(null); // Selected run details
  const [walletInfo, setWalletInfo] = useState(null); // Wallet info: {address, balance, etherscanLink}

  // Repository update handler
  const handleUpdateRepo = async () => {
    setUpdating(true);
    setUpdateResult(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/update-repo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUpdateResult({ success: true, message: data.message, output: data.output });
      } else {
        setUpdateResult({ success: false, message: data.error, details: data.details });
      }
      setTimeout(() => {
        setUpdateResult(null);
      }, 6000);
    } catch (error) {
      setUpdateResult({ success: false, message: 'Network error', details: error.message });
    } finally {
      setUpdating(false);
    }
  };

  // Fetch wallet info once on mount
  useEffect(() => {
    async function fetchWalletInfo() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/wallet-info`);
        if (!res.ok) throw new Error('Failed to fetch wallet info');
        const data = await res.json();
        setWalletInfo(data);
      } catch (error) {
        console.error('Fetch wallet info error:', error);
      }
    }
    fetchWalletInfo();
  }, []);

  // Fetch job names once on mount
  useEffect(() => {
    async function fetchJobNames() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/job-names`);
        if (!res.ok) throw new Error('Failed to fetch job names');
        const { jobNames: data } = await res.json();
        setJobNames(data);
      } catch (error) {
        console.error('Fetch job names error:', error);
      }
    }
    fetchJobNames();
  }, []);

  // Fetch runs based on pagination and selected job name
  useEffect(() => {
    async function fetchRuns() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        let url = `${backendUrl}/api/runs?page=${paginationModel.page + 1}&limit=${paginationModel.pageSize}`;
        if (selectedJobName) {
          url += `&job_name=${encodeURIComponent(selectedJobName)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const { runs: data, total: count } = await res.json();
        setRuns(data.map((run, index) => ({ ...run, id: run.id || index }))); // Ensure unique id
        setTotal(count);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRuns();
  }, [paginationModel, selectedJobName]); // Re-fetch on pagination or selection change

  const handleJobNameClick = (name) => {
    setSelectedJobName(prev => prev === name ? null : name); // Toggle: if same, deselect
    setPaginationModel(prev => ({ ...prev, page: 0 })); // Reset to page 1
    setSelectedRun(null); // Clear selection on filter change
  };

  const handleRowSelection = (newSelectionModel) => {
    const selectedId = newSelectionModel.ids.values().next().value; // Single selection
    const run = runs.find(r => r.id === selectedId);
    setSelectedRun(run || null);
  };

  return (
    <main style={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>
        Automated Actions Dashboard
      </Typography>

      {/* Repository Management */}
      <Card sx={{ display: 'flex', flex: 0, gap: 3 }} variant="outlined" style={{ marginBottom: '20px' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Repository Management</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Update the Origin Dollar smart contracts repository to get the latest changes.
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleUpdateRepo}
            disabled={updating}
            startIcon={updating ? <CircularProgress size={20} /> : null}
          >
            {updating ? 'Updating...' : 'Update Repository'}
          </Button>
        </CardContent>

        {/* Update Result Alert */}
        {updateResult && (
          <Alert
            severity={updateResult.success ? 'success' : 'error'}
          >
            <Typography variant="body1">{updateResult.message}</Typography>
            {updateResult.output && (
              <Box component="pre" style={{
                marginTop: '10px',
                fontSize: '0.8em',
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {updateResult.output}
              </Box>
            )}
            {updateResult.details && (
              <Typography variant="body2" style={{ marginTop: '10px' }}>
                Details: {updateResult.details}
              </Typography>
            )}
          </Alert>
        )}
      </Card>

      {/* Job Runs Dashboard */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Left Vertical Menu */}
        <Box sx={{ width: 250 }}>
          {walletInfo && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1">
                  Signer: {`${walletInfo.address.substring(0,6)}...${walletInfo.address.substring(walletInfo.address.length - 4,walletInfo.address.length)}`}
                </Typography>
                <Typography variant="subtitle1">Balance: {walletInfo.balance} ETH</Typography>
                <Link href={walletInfo.etherscanLink} target="_blank" rel="noopener noreferrer">
                  etherscan
                </Link>
              </CardContent>
            </Card>
          )}

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Names
              </Typography>
              <Divider />
              <List>
                {jobNames.map((job) => (
                  <ListItem key={job.name} disablePadding>
                    <ListItemButton sx={{
                      mb:1,
                      p:1,
                      borderRadius: 1,
                      border: '1px solid #333333',
                    }}
                      selected={selectedJobName === job.name}
                      onClick={() => handleJobNameClick(job.name)}
                    >
                      <ListItemText primary={`${job.name} (${job.count})`} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Center DataGrid */}
        <Box sx={{ flex: 0 }}>
          <Typography variant="h4" gutterBottom>
            Job Runs {selectedJobName ? `(Filtered by ${selectedJobName})` : ''}
          </Typography>
          <DataGrid
            rows={runs}
            columns={[
              { field: 'id', headerName: 'ID', width: 90 },
              { field: 'job_name', headerName: 'Job Name', width: 200 },
              { 
                field: 'run_time', 
                headerName: 'Run Time', 
                width: 200, 
                valueFormatter: (value) => timeAgo(value)
              },
              { field: 'success', headerName: 'Success', width: 100, valueFormatter: ({ value }) => value ? "✅" : "❌"},
            ]}
            rowCount={total}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            paginationMode="server"
            onPaginationModelChange={setPaginationModel}
            onRowSelectionModelChange={handleRowSelection}
            checkboxSelection={false}
            autoHeight
          />
        </Box>

      {/* Run Details Panel - SSR compatible */}
        {selectedRun && (
          <Card variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Typography variant="h5" gutterBottom>
              Run Details (ID: {selectedRun.id})
            </Typography>
            <Typography><strong>Job Name:</strong> {selectedRun.job_name}</Typography>
            <Typography><strong>Run Time:</strong> {selectedRun.run_time ? timeAgo(selectedRun.run_time) : ''}</Typography>
            <Typography><strong>Success:</strong> {selectedRun.success ? "✅" : "❌"}</Typography>
            <Typography><strong>Command:</strong> {selectedRun.command}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Stdout</Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                bgcolor: '#000000',
                color: '#FFFFFF',
                fontFamily: 'Menlo, Monaco, Courier New, monospace',
                p: 2,
                borderRadius: 1,
                border: '1px solid #333333',
                fontSize: '0.875rem',
              }}
            >
              {selectedRun.stdout || 'No output'}
            </Box>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Stderr</Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                bgcolor: '#000000',
                color: '#FF4D4D',
                fontFamily: 'Menlo, Monaco, Courier New, monospace',
                p: 2,
                borderRadius: 1,
                border: '1px solid #333333',
                fontSize: '0.875rem',
              }}
            >
              {selectedRun.stderr || 'No error output'}
            </Box>
            <Button
              variant="outlined"
              onClick={() => setSelectedRun(null)}
              sx={{ mt: 2 }}
            >
              Close Details
            </Button>
          </Card>
        )}
      </Box>
    </main>
  );
}
