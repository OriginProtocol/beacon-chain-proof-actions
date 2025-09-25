'use client'; // Client component for state and fetching

import { useState, useEffect } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

import { timeAgo } from "../../utils/time";

export default function RunsPage() {
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

  // Fetch job names once on mount
  useEffect(() => {
    async function fetchJobNames() {
      try {
        const res = await fetch('/api/job-names');
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
        let url = `/api/runs?page=${paginationModel.page + 1}&limit=${paginationModel.pageSize}`;
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

  const handleCloseModal = () => {
    setSelectedRun(null);
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'job_name', headerName: 'Job Name', width: 200 },
    { 
      field: 'run_time', 
      headerName: 'Run Time', 
      width: 200, 
      valueFormatter: (value) => timeAgo(value)
    },
    { field: 'success', headerName: 'Success', width: 100, valueFormatter: ({ value }) => value ? "✅" : "❌"},
  ];


  return (
    <Box sx={{ display: 'flex', p: 3 }}>
      {/* Left Vertical Menu */}
      <Box sx={{ width: 250, mr: 3 }}>
        <Typography variant="h6" gutterBottom>
          Job Names
        </Typography>
        <Divider />
        <List>
          {jobNames.map((job) => (
            <ListItem key={job.name} disablePadding>
              <ListItemButton
                selected={selectedJobName === job.name}
                onClick={() => handleJobNameClick(job.name)}
              >
                <ListItemText primary={`${job.name} (${job.count})`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Center DataGrid */}
      <Box sx={{ flex: 0 }}>
        <Typography variant="h4" gutterBottom>
          Job Runs {selectedJobName ? `(Filtered by ${selectedJobName})` : ''}
        </Typography>
        <DataGrid
          rows={runs}
          columns={columns}
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

      {/* Full Screen Modal for Details */}
      <Dialog
        open={!!selectedRun}
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Run Details (ID: {selectedRun?.id})
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography><strong>Job Name:</strong> {selectedRun?.job_name}</Typography>
          <Typography><strong>Run Time:</strong> {selectedRun?.run_time ? timeAgo(selectedRun.run_time) : ''}</Typography>
          <Typography><strong>Success:</strong> {selectedRun?.success ? "✅" : "❌"}</Typography>
          <Typography><strong>Command:</strong> {selectedRun?.command}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Stdout</Typography>
          <Box 
            sx={{ 
              maxHeight: 300, 
              overflow: 'auto', 
              whiteSpace: 'pre-wrap', 
              bgcolor: '#000000', // Black background like Terminal
              color: '#FFFFFF', // White text
              fontFamily: 'Menlo, Monaco, Courier New, monospace', // Monospaced font
              p: 2, // Padding for console feel
              borderRadius: 1,
              border: '1px solid #333333', // Optional subtle border
              fontSize: '0.875rem', // Smaller font for authenticity
            }}
          >
            {selectedRun?.stdout || 'No output'}
          </Box>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>Stderr</Typography>
          <Box 
            sx={{ 
              maxHeight: 300, 
              overflow: 'auto', 
              whiteSpace: 'pre-wrap', 
              bgcolor: '#000000', 
              color: '#FF4D4D', // Red for errors (or #FFFFFF for uniform)
              fontFamily: 'Menlo, Monaco, Courier New, monospace',
              p: 2, 
              borderRadius: 1,
              border: '1px solid #333333',
              fontSize: '0.875rem',
            }}
          >
            {selectedRun?.stderr || 'No error output'}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}