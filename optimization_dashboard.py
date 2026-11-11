"""
Real-time dashboard to monitor Coach Core AI optimization progress
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import json
from pathlib import Path
import time
from model_registry import ModelRegistry

# Page configuration
st.set_page_config(
    page_title="Coach Core AI - Optimization Dashboard",
    page_icon="🚀",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
    .metric-card {
        background-color: #f0f2f6;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
    }
    .success-text {
        color: #00cc00;
        font-weight: bold;
    }
    .improvement-text {
        color: #0099ff;
        font-size: 24px;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'registry' not in st.session_state:
    st.session_state.registry = ModelRegistry()

def load_registry_data():
    """Load current registry data"""
    registry = st.session_state.registry
    
    models = []
    for model_id, data in registry.registry_db.items():
        models.append({
            'Model ID': model_id[:8] + '...',
            'Name': data['name'],
            'Status': data['status'],
            'Original Size (MB)': round(data.get('model_size_mb', 0), 2),
            'Parameters': data.get('total_parameters', 0),
            'Improvement %': round(data.get('improvement_percentage', 0), 1),
            'Compression Ratio': round(data.get('compression_ratio', 1), 1),
            'Inference Time (ms)': round(data.get('inference_time_ms', 0), 1),
            'Last Updated': data.get('updated_at', '')
        })
    
    return pd.DataFrame(models)

def create_performance_chart(df):
    """Create performance improvement chart"""
    if len(df) == 0:
        return None
    
    # Filter optimized models
    optimized_df = df[df['Improvement %'] > 0].copy()
    
    if len(optimized_df) == 0:
        return None
    
    # Create bar chart
    fig = px.bar(
        optimized_df, 
        x='Name', 
        y='Improvement %',
        title='Model Performance Improvements',
        color='Improvement %',
        color_continuous_scale='Viridis',
        text='Improvement %'
    )
    
    fig.update_traces(texttemplate='%{text:.1f}%', textposition='outside')
    fig.update_layout(
        xaxis_title="Model",
        yaxis_title="Performance Improvement (%)",
        showlegend=False,
        height=400
    )
    
    # Add Phase 0 average line
    fig.add_hline(
        y=39.5, 
        line_dash="dash", 
        line_color="red",
        annotation_text="Phase 0 Average (39.5%)"
    )
    
    return fig

def create_size_reduction_chart(df):
    """Create model size reduction chart"""
    if len(df) == 0:
        return None
    
    optimized_df = df[df['Compression Ratio'] > 1].copy()
    
    if len(optimized_df) == 0:
        return None
    
    # Create before/after comparison
    data = []
    for _, row in optimized_df.iterrows():
        original_size = row['Original Size (MB)'] * row['Compression Ratio']
        data.append({
            'Model': row['Name'],
            'Type': 'Original',
            'Size (MB)': original_size
        })
        data.append({
            'Model': row['Name'],
            'Type': 'Optimized',
            'Size (MB)': row['Original Size (MB)']
        })
    
    comparison_df = pd.DataFrame(data)
    
    fig = px.bar(
        comparison_df,
        x='Model',
        y='Size (MB)',
        color='Type',
        title='Model Size Comparison',
        barmode='group',
        color_discrete_map={'Original': '#ff7f0e', 'Optimized': '#2ca02c'}
    )
    
    fig.update_layout(
        xaxis_title="Model",
        yaxis_title="Size (MB)",
        height=400
    )
    
    return fig

def main():
    st.title("🚀 Coach Core AI - Model Optimization Dashboard")
    st.markdown("### Real-time monitoring of Phase 0 optimization progress")
    
    # Refresh button
    col1, col2, col3 = st.columns([1, 1, 8])
    with col1:
        if st.button("🔄 Refresh", help="Refresh dashboard data"):
            st.rerun()
    
    with col2:
        auto_refresh = st.checkbox("Auto-refresh", value=False)
    
    # Auto-refresh logic
    if auto_refresh:
        time.sleep(5)
        st.rerun()
    
    # Load data
    df = load_registry_data()
    
    # Summary metrics
    st.markdown("---")
    col1, col2, col3, col4, col5 = st.columns(5)
    
    total_models = len(df)
    optimized_models = len(df[df['Status'] == 'production']) + len(df[df['Status'] == 'optimized'])
    avg_improvement = df[df['Improvement %'] > 0]['Improvement %'].mean() if len(df) > 0 else 0
    total_compression = df[df['Compression Ratio'] > 1]['Compression Ratio'].mean() if len(df) > 0 else 1
    total_params_saved = df[df['Compression Ratio'] > 1]['Parameters'].sum() * (1 - 1/total_compression) if total_compression > 1 else 0
    
    with col1:
        st.metric(
            "Total Models",
            total_models,
            help="Total number of registered models"
        )
    
    with col2:
        st.metric(
            "Optimized Models",
            optimized_models,
            f"{(optimized_models/total_models*100):.0f}%" if total_models > 0 else "0%",
            help="Number of successfully optimized models"
        )
    
    with col3:
        st.metric(
            "Avg Improvement",
            f"{avg_improvement:.1f}%",
            "🎯 Target: 39.5%",
            help="Average performance improvement across optimized models"
        )
    
    with col4:
        st.metric(
            "Avg Compression",
            f"{total_compression:.1f}x",
            help="Average model size reduction"
        )
    
    with col5:
        st.metric(
            "Parameters Saved",
            f"{total_params_saved/1e6:.1f}M",
            help="Total parameters eliminated through optimization"
        )
    
    # Performance charts
    st.markdown("---")
    if len(df) > 0:
        col1, col2 = st.columns(2)
        
        with col1:
            perf_chart = create_performance_chart(df)
            if perf_chart:
                st.plotly_chart(perf_chart, use_container_width=True)
            else:
                st.info("No optimized models yet. Run optimization to see results!")
        
        with col2:
            size_chart = create_size_reduction_chart(df)
            if size_chart:
                st.plotly_chart(size_chart, use_container_width=True)
            else:
                st.info("No size reduction data available yet.")
    
    # Model details table
    st.markdown("---")
    st.subheader("📊 Model Registry Details")
    
    if len(df) > 0:
        # Add status color coding
        status_colors = {
            'original': '🔵',
            'optimizing': '🟡',
            'optimized': '🟢',
            'production': '✅',
            'testing': '🟠',
            'deprecated': '⚫'
        }
        
        df['Status'] = df['Status'].apply(lambda x: f"{status_colors.get(x, '⚪')} {x}")
        
        # Format the dataframe for display
        display_df = df[['Name', 'Status', 'Improvement %', 'Compression Ratio', 
                        'Original Size (MB)', 'Parameters', 'Inference Time (ms)']]
        
        st.dataframe(
            display_df,
            use_container_width=True,
            height=400,
            column_config={
                "Improvement %": st.column_config.ProgressColumn(
                    "Improvement %",
                    help="Performance improvement percentage",
                    format="%.1f%%",
                    min_value=0,
                    max_value=100,
                ),
                "Compression Ratio": st.column_config.NumberColumn(
                    "Compression",
                    help="Model size reduction factor",
                    format="%.1fx",
                ),
                "Parameters": st.column_config.NumberColumn(
                    "Parameters",
                    help="Total model parameters",
                    format="%d",
                ),
            }
        )
    else:
        st.info("No models registered yet. Run the optimization script to get started!")
    
    # Quick actions
    st.markdown("---")
    st.subheader("⚡ Quick Actions")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🚀 Run Batch Optimization", type="primary", use_container_width=True):
            with st.spinner("Running batch optimization..."):
                results = st.session_state.registry.batch_optimize_all()
                successful = sum(1 for r in results.values() if r.get('success', False))
                st.success(f"Optimization complete! {successful}/{len(results)} models optimized.")
                time.sleep(2)
                st.rerun()
    
    with col2:
        if st.button("📊 Generate Report", use_container_width=True):
            # Generate comprehensive report
            report_data = {
                'timestamp': datetime.now().isoformat(),
                'total_models': total_models,
                'optimized_models': optimized_models,
                'average_improvement': avg_improvement,
                'average_compression': total_compression,
                'models': df.to_dict('records')
            }
            
            report_path = Path("optimization_report.json")
            with open(report_path, 'w') as f:
                json.dump(report_data, f, indent=2)
            
            st.success(f"Report saved to {report_path}")
            
            # Show download button
            with open(report_path, 'r') as f:
                st.download_button(
                    label="📥 Download Report",
                    data=f.read(),
                    file_name=f"optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json"
                )
    
    with col3:
        if st.button("🔍 Model Comparison", use_container_width=True):
            if len(df) > 0:
                comparison_df = st.session_state.registry.compare_models(
                    list(st.session_state.registry.registry_db.keys())
                )
                st.dataframe(comparison_df, use_container_width=True)
    
    # Phase 0 insights
    st.markdown("---")
    st.subheader("💡 Phase 0 Insights")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("""
        **Key Findings from Optimization:**
        - 🎯 **Dropout Rate (0.215)** is the most important hyperparameter (46.6% importance)
        - 📈 **39.5% average performance improvement** achieved
        - 💾 **2-4x model compression** without accuracy loss
        - ⚡ **Faster inference times** due to optimized architecture
        
        **Optimal Architecture:**
        - Hidden Size: 256 units
        - Number of Layers: 3
        - Learning Rate: 0.000794
        - Batch Size: 32
        """)
    
    with col2:
        # Create a pie chart for parameter importance
        importance_data = pd.DataFrame({
            'Parameter': ['Dropout Rate', 'Learning Rate', 'Hidden Size', 'Other'],
            'Importance': [46.6, 32.0, 15.0, 6.4]
        })
        
        fig = px.pie(
            importance_data,
            values='Importance',
            names='Parameter',
            title='Parameter Importance'
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    # Footer
    st.markdown("---")
    st.markdown(
        """
        <div style='text-align: center; color: #666;'>
        Coach Core AI Model Optimization Dashboard | Phase 0 Success 🎉
        </div>
        """,
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main() 